/**
 * AMM 価格計算ロジック
 * Uniswap V2 の Constant Product Formula (x * y = k) に基づく計算
 */

import { formatUnits } from "viem";

/**
 * AMM 計算に使用する定数
 */
export const AMM_CONSTANTS = {
  // 取引手数料 (0.3%)
  TRADING_FEE: 0.003,
  // 手数料計算用の分子・分母
  FEE_NUMERATOR: 997,
  FEE_DENOMINATOR: 1000,
  // 最小流動性（初回流動性提供時にバーンされる量）
  MINIMUM_LIQUIDITY: BigInt(1000),
} as const;

/**
 * スワップ時の出力量を計算（AMM式: x * y = k）
 *
 * @param amountIn 入力トークン量
 * @param reserveIn 入力トークンのリザーブ量
 * @param reserveOut 出力トークンのリザーブ量
 * @returns 出力トークン量
 */
export function calculateAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  if (amountIn <= BigInt(0)) return BigInt(0);
  if (reserveIn <= BigInt(0) || reserveOut <= BigInt(0)) return BigInt(0);

  // 手数料を差し引いた入力量を計算
  const amountInWithFee = amountIn * BigInt(AMM_CONSTANTS.FEE_NUMERATOR);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * BigInt(AMM_CONSTANTS.FEE_DENOMINATOR) + amountInWithFee;

  return numerator / denominator;
}

/**
 * 指定した出力量を得るために必要な入力量を計算
 *
 * @param amountOut 希望する出力トークン量
 * @param reserveIn 入力トークンのリザーブ量
 * @param reserveOut 出力トークンのリザーブ量
 * @returns 必要な入力トークン量
 */
export function calculateAmountIn(
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  if (amountOut <= BigInt(0)) return BigInt(0);
  if (reserveIn <= BigInt(0) || reserveOut <= BigInt(0)) return BigInt(0);
  if (amountOut >= reserveOut) return BigInt(0); // 出力量がリザーブを超える場合

  const numerator = reserveIn * amountOut * BigInt(AMM_CONSTANTS.FEE_DENOMINATOR);
  const denominator = (reserveOut - amountOut) * BigInt(AMM_CONSTANTS.FEE_NUMERATOR);

  return numerator / denominator + BigInt(1); // 切り上げのため+1
}

/**
 * 価格インパクトを計算（パーセンテージ）
 *
 * @param amountIn 入力トークン量
 * @param reserveIn 入力トークンのリザーブ量
 * @param reserveOut 出力トークンのリザーブ量
 * @returns 価格インパクト（0-100の数値）
 */
export function calculatePriceImpact(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  if (reserveIn <= BigInt(0) || reserveOut <= BigInt(0) || amountIn <= BigInt(0)) return 0;

  // スワップ前の価格
  const priceBefore = Number(reserveOut) / Number(reserveIn);

  // スワップ後のリザーブ
  const amountOut = calculateAmountOut(amountIn, reserveIn, reserveOut);
  const newReserveIn = reserveIn + amountIn;
  const newReserveOut = reserveOut - amountOut;

  if (newReserveOut <= BigInt(0)) return 100; // 流動性不足

  // スワップ後の価格
  const priceAfter = Number(newReserveOut) / Number(newReserveIn);

  // 価格インパクトを計算（パーセンテージ）
  const priceImpact = Math.abs((priceAfter - priceBefore) / priceBefore) * 100;

  return Math.min(priceImpact, 100); // 最大100%
}

/**
 * 流動性追加時の最適な比率を計算
 *
 * @param amountADesired 希望するトークンA量
 * @param amountBDesired 希望するトークンB量
 * @param reserveA トークンAのリザーブ量
 * @param reserveB トークンBのリザーブ量
 * @returns 最適なトークン量の組み合わせ
 */
export function calculateOptimalLiquidityAmounts(
  amountADesired: bigint,
  amountBDesired: bigint,
  reserveA: bigint,
  reserveB: bigint
): { amountA: bigint; amountB: bigint } {
  // 初回流動性提供の場合
  if (reserveA === BigInt(0) && reserveB === BigInt(0)) {
    return {
      amountA: amountADesired,
      amountB: amountBDesired,
    };
  }

  // 既存の比率に基づいて最適な量を計算
  const amountBOptimal = (amountADesired * reserveB) / reserveA;

  if (amountBOptimal <= amountBDesired) {
    return {
      amountA: amountADesired,
      amountB: amountBOptimal,
    };
  } else {
    const amountAOptimal = (amountBDesired * reserveA) / reserveB;
    return {
      amountA: amountAOptimal,
      amountB: amountBDesired,
    };
  }
}

/**
 * LP トークンの発行量を計算
 *
 * @param amountA トークンA量
 * @param amountB トークンB量
 * @param reserveA トークンAのリザーブ量
 * @param reserveB トークンBのリザーブ量
 * @param totalSupply 現在のLPトークン総供給量
 * @returns 発行されるLPトークン量
 */
export function calculateLiquidityMinted(
  amountA: bigint,
  amountB: bigint,
  reserveA: bigint,
  reserveB: bigint,
  totalSupply: bigint
): bigint {
  // 初回流動性提供の場合
  if (totalSupply === BigInt(0)) {
    // 幾何平均を計算し、最小流動性を差し引く
    const liquidity = sqrt(amountA * amountB);
    return liquidity > AMM_CONSTANTS.MINIMUM_LIQUIDITY
      ? liquidity - AMM_CONSTANTS.MINIMUM_LIQUIDITY
      : BigInt(0);
  }

  // 既存プールへの流動性追加の場合
  const liquidityA = (amountA * totalSupply) / reserveA;
  const liquidityB = (amountB * totalSupply) / reserveB;

  // 小さい方を採用（比率を維持するため）
  return liquidityA < liquidityB ? liquidityA : liquidityB;
}

/**
 * LP トークンバーン時に受け取れるトークン量を計算
 *
 * @param liquidity バーンするLPトークン量
 * @param totalSupply 現在のLPトークン総供給量
 * @param reserveA トークンAのリザーブ量
 * @param reserveB トークンBのリザーブ量
 * @returns 受け取れるトークン量
 */
export function calculateTokensFromLiquidity(
  liquidity: bigint,
  totalSupply: bigint,
  reserveA: bigint,
  reserveB: bigint
): { amountA: bigint; amountB: bigint } {
  if (totalSupply === BigInt(0)) {
    return { amountA: BigInt(0), amountB: BigInt(0) };
  }

  const amountA = (liquidity * reserveA) / totalSupply;
  const amountB = (liquidity * reserveB) / totalSupply;

  return { amountA, amountB };
}

/**
 * 現在の交換レートを計算
 *
 * @param reserveA トークンAのリザーブ量
 * @param reserveB トークンBのリザーブ量
 * @param decimalsA トークンAの小数点桁数
 * @param decimalsB トークンBの小数点桁数
 * @returns 交換レート（1 tokenA = X tokenB）
 */
export function calculateExchangeRate(
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number,
  decimalsB: number
): number {
  if (reserveA === BigInt(0) || reserveB === BigInt(0)) return 0;

  // 小数点を考慮した計算
  const adjustedReserveA = Number(formatUnits(reserveA, decimalsA));
  const adjustedReserveB = Number(formatUnits(reserveB, decimalsB));

  return adjustedReserveB / adjustedReserveA;
}

/**
 * スリッページを考慮した最小受取量を計算
 *
 * @param expectedAmount 期待される受取量
 * @param slippagePercent スリッページ許容値（パーセンテージ）
 * @returns 最小受取量
 */
export function calculateMinimumAmountOut(expectedAmount: bigint, slippagePercent: number): bigint {
  const slippageMultiplier = (100 - slippagePercent) / 100;
  return BigInt(Math.floor(Number(expectedAmount) * slippageMultiplier));
}

/**
 * スリッページを考慮した最大支払量を計算
 *
 * @param expectedAmount 期待される支払量
 * @param slippagePercent スリッページ許容値（パーセンテージ）
 * @returns 最大支払量
 */
export function calculateMaximumAmountIn(expectedAmount: bigint, slippagePercent: number): bigint {
  const slippageMultiplier = (100 + slippagePercent) / 100;
  return BigInt(Math.ceil(Number(expectedAmount) * slippageMultiplier));
}

/**
 * 平方根を計算（BigInt用）
 * ニュートン法を使用した近似計算
 *
 * @param value 平方根を求める値
 * @returns 平方根
 */
function sqrt(value: bigint): bigint {
  if (value < BigInt(0)) return BigInt(0);
  if (value < BigInt(2)) return value;

  let x = value;
  let y = (x + BigInt(1)) / BigInt(2);

  while (y < x) {
    x = y;
    y = (x + value / x) / BigInt(2);
  }

  return x;
}

/**
 * APR（年間収益率）を計算
 *
 * @param dailyVolume 日次取引量
 * @param totalLiquidity 総流動性
 * @param feeRate 手数料率（デフォルト0.3%）
 * @returns APR（パーセンテージ）
 */
export function calculateAPR(
  dailyVolume: number,
  totalLiquidity: number,
  feeRate: number = AMM_CONSTANTS.TRADING_FEE
): number {
  if (totalLiquidity <= 0) return 0;

  // 日次手数料収入
  const dailyFees = dailyVolume * feeRate;

  // 日次収益率
  const dailyYield = dailyFees / totalLiquidity;

  // 年間収益率（複利計算）
  const apr = ((1 + dailyYield) ** 365 - 1) * 100;

  return Math.max(0, apr);
}

/**
 * TVL（Total Value Locked）を計算
 *
 * @param reserveA トークンAのリザーブ量
 * @param reserveB トークンBのリザーブ量
 * @param priceA トークンAの価格（USD）
 * @param priceB トークンBの価格（USD）
 * @param decimalsA トークンAの小数点桁数
 * @param decimalsB トークンBの小数点桁数
 * @returns TVL（USD）
 */
export function calculateTVL(
  reserveA: bigint,
  reserveB: bigint,
  priceA: number,
  priceB: number,
  decimalsA: number,
  decimalsB: number
): number {
  const valueA = Number(formatUnits(reserveA, decimalsA)) * priceA;
  const valueB = Number(formatUnits(reserveB, decimalsB)) * priceB;

  return valueA + valueB;
}
