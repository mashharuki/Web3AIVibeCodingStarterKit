/**
 * 入力値検証機能
 * ユーザー入力の妥当性チェックとエラーメッセージ生成
 */

import { isAddress } from "viem";
import { isValidTokenAddress } from "../lib/tokens";

/**
 * バリデーション結果の型定義
 */
export interface ValidationResult {
  /** 検証が成功したかどうか */
  isValid: boolean;
  /** エラーメッセージ（検証失敗時） */
  error?: string;
  /** 警告メッセージ（検証成功だが注意が必要な場合） */
  warning?: string;
}

/**
 * バリデーション設定オプション
 */
export interface ValidationOptions {
  /** 必須フィールドかどうか */
  required?: boolean;
  /** 最小値 */
  min?: number;
  /** 最大値 */
  max?: number;
  /** 最小長 */
  minLength?: number;
  /** 最大長 */
  maxLength?: number;
  /** カスタムエラーメッセージ */
  customMessage?: string;
}

/**
 * トークン量の検証
 *
 * @param amount 検証するトークン量（文字列）
 * @param options 検証オプション
 * @returns 検証結果
 */
export function validateTokenAmount(
  amount: string,
  options: ValidationOptions = {}
): ValidationResult {
  const { required = true, min = 0, max = Number.MAX_SAFE_INTEGER } = options;

  // 必須チェック
  if (required && (!amount || amount.trim() === "")) {
    return {
      isValid: false,
      error: "トークン量を入力してください",
    };
  }

  // 空文字列の場合（非必須）
  if (!amount || amount.trim() === "") {
    return { isValid: true };
  }

  // 数値形式チェック
  const numericValue = Number(amount);
  if (isNaN(numericValue) || !isFinite(numericValue)) {
    return {
      isValid: false,
      error: "有効な数値を入力してください",
    };
  }

  // 負の値チェック
  if (numericValue < 0) {
    return {
      isValid: false,
      error: "正の数値を入力してください",
    };
  }

  // 最小値チェック
  if (numericValue < min) {
    return {
      isValid: false,
      error: `${min}以上の値を入力してください`,
    };
  }

  // 最大値チェック
  if (numericValue > max) {
    return {
      isValid: false,
      error: `${max}以下の値を入力してください`,
    };
  }

  // 小数点桁数チェック（過度に細かい値の警告）
  const decimalPlaces = (amount.split(".")[1] || "").length;
  if (decimalPlaces > 18) {
    return {
      isValid: false,
      error: "小数点以下は18桁以内で入力してください",
    };
  }

  // 非常に小さい値の警告
  if (numericValue > 0 && numericValue < 0.000001) {
    return {
      isValid: true,
      warning: "非常に小さい値です。取引が失敗する可能性があります",
    };
  }

  return { isValid: true };
}

/**
 * スリッページ許容値の検証
 *
 * @param slippage スリッページ値（パーセンテージ）
 * @param options 検証オプション
 * @returns 検証結果
 */
export function validateSlippage(
  slippage: string | number,
  options: ValidationOptions = {}
): ValidationResult {
  const slippageStr = typeof slippage === "number" ? slippage.toString() : slippage;
  const { min = 0.1, max = 50 } = options;

  // 基本的な数値検証
  const basicValidation = validateTokenAmount(slippageStr, { required: true, min, max });
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  const numericValue = Number(slippageStr);

  // スリッページ固有の検証
  if (numericValue < 0.1) {
    return {
      isValid: false,
      error: "スリッページは0.1%以上に設定してください",
    };
  }

  if (numericValue > 50) {
    return {
      isValid: false,
      error: "スリッページは50%以下に設定してください",
    };
  }

  // 警告レベルのチェック
  if (numericValue < 0.5) {
    return {
      isValid: true,
      warning: "スリッページが低すぎます。取引が失敗する可能性があります",
    };
  }

  if (numericValue > 5) {
    return {
      isValid: true,
      warning: "スリッページが高すぎます。予期しない損失が発生する可能性があります",
    };
  }

  return { isValid: true };
}

/**
 * デッドライン（期限）の検証
 *
 * @param deadline デッドライン（分）
 * @param options 検証オプション
 * @returns 検証結果
 */
export function validateDeadline(
  deadline: string | number,
  options: ValidationOptions = {}
): ValidationResult {
  const deadlineStr = typeof deadline === "number" ? deadline.toString() : deadline;
  const { min = 1, max = 4320 } = options; // 最大3日（4320分）

  // 基本的な数値検証
  const basicValidation = validateTokenAmount(deadlineStr, { required: true, min, max });
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  const numericValue = Number(deadlineStr);

  // 整数チェック
  if (!Number.isInteger(numericValue)) {
    return {
      isValid: false,
      error: "整数で入力してください",
    };
  }

  // デッドライン固有の検証
  if (numericValue < 1) {
    return {
      isValid: false,
      error: "デッドラインは1分以上に設定してください",
    };
  }

  if (numericValue > 4320) {
    return {
      isValid: false,
      error: "デッドラインは3日（4320分）以下に設定してください",
    };
  }

  // 警告レベルのチェック
  if (numericValue < 5) {
    return {
      isValid: true,
      warning: "デッドラインが短すぎます。取引が失敗する可能性があります",
    };
  }

  if (numericValue > 1440) {
    // 1日以上
    return {
      isValid: true,
      warning: "デッドラインが長すぎます。価格変動リスクが高くなります",
    };
  }

  return { isValid: true };
}

/**
 * ウォレットアドレスの検証
 *
 * @param address ウォレットアドレス
 * @param options 検証オプション
 * @returns 検証結果
 */
export function validateAddress(
  address: string,
  options: ValidationOptions = {}
): ValidationResult {
  const { required = true } = options;

  // 必須チェック
  if (required && (!address || address.trim() === "")) {
    return {
      isValid: false,
      error: "アドレスを入力してください",
    };
  }

  // 空文字列の場合（非必須）
  if (!address || address.trim() === "") {
    return { isValid: true };
  }

  // Ethereum アドレス形式チェック
  if (!isAddress(address)) {
    return {
      isValid: false,
      error: "有効なEthereumアドレスを入力してください",
    };
  }

  return { isValid: true };
}

/**
 * トークンアドレスの検証（サポート対象トークンかチェック）
 *
 * @param address トークンアドレス
 * @param options 検証オプション
 * @returns 検証結果
 */
export function validateTokenAddress(
  address: string,
  options: ValidationOptions = {}
): ValidationResult {
  // 基本的なアドレス検証
  const addressValidation = validateAddress(address, options);
  if (!addressValidation.isValid) {
    return addressValidation;
  }

  // 空文字列の場合
  if (!address || address.trim() === "") {
    return { isValid: true };
  }

  // サポート対象トークンかチェック
  if (!isValidTokenAddress(address)) {
    return {
      isValid: false,
      error: "サポートされていないトークンです",
    };
  }

  return { isValid: true };
}

/**
 * 流動性比率の検証
 *
 * @param percentage 流動性除去の割合（0-100）
 * @param options 検証オプション
 * @returns 検証結果
 */
export function validateLiquidityPercentage(
  percentage: string | number,
  options: ValidationOptions = {}
): ValidationResult {
  const percentageStr = typeof percentage === "number" ? percentage.toString() : percentage;
  const { min = 0, max = 100 } = options;

  // 基本的な数値検証
  const basicValidation = validateTokenAmount(percentageStr, { required: true, min, max });
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  const numericValue = Number(percentageStr);

  // 範囲チェック
  if (numericValue < 0 || numericValue > 100) {
    return {
      isValid: false,
      error: "0から100の間で入力してください",
    };
  }

  // 警告レベルのチェック
  if (numericValue === 100) {
    return {
      isValid: true,
      warning: "全ての流動性を除去します。この操作は取り消せません",
    };
  }

  return { isValid: true };
}

/**
 * 残高の十分性チェック
 *
 * @param amount 使用予定量
 * @param balance 現在の残高
 * @param symbol トークンシンボル
 * @returns 検証結果
 */
export function validateSufficientBalance(
  amount: string | number,
  balance: string | number,
  symbol: string = "トークン"
): ValidationResult {
  const amountNum = typeof amount === "string" ? Number(amount) : amount;
  const balanceNum = typeof balance === "string" ? Number(balance) : balance;

  if (isNaN(amountNum) || isNaN(balanceNum)) {
    return {
      isValid: false,
      error: "無効な数値です",
    };
  }

  if (amountNum > balanceNum) {
    return {
      isValid: false,
      error: `${symbol}の残高が不足しています`,
    };
  }

  // 残高の90%以上を使用する場合の警告
  if (amountNum > balanceNum * 0.9) {
    return {
      isValid: true,
      warning: `${symbol}の残高の大部分を使用します`,
    };
  }

  return { isValid: true };
}

/**
 * 価格インパクトの検証
 *
 * @param priceImpact 価格インパクト（パーセンテージ）
 * @returns 検証結果
 */
export function validatePriceImpact(priceImpact: number): ValidationResult {
  if (isNaN(priceImpact) || !isFinite(priceImpact)) {
    return {
      isValid: false,
      error: "価格インパクトを計算できません",
    };
  }

  if (priceImpact > 15) {
    return {
      isValid: false,
      error: "価格インパクトが大きすぎます（15%超）。取引量を減らしてください",
    };
  }

  if (priceImpact > 5) {
    return {
      isValid: true,
      warning: "価格インパクトが大きいです。取引を続行しますか？",
    };
  }

  if (priceImpact > 1) {
    return {
      isValid: true,
      warning: "価格インパクトが1%を超えています",
    };
  }

  return { isValid: true };
}

/**
 * 複数の検証結果をまとめる
 *
 * @param validations 検証結果の配列
 * @returns 統合された検証結果
 */
export function combineValidations(validations: ValidationResult[]): ValidationResult {
  const errors = validations
    .filter((v) => !v.isValid)
    .map((v) => v.error)
    .filter(Boolean);
  const warnings = validations
    .filter((v) => v.isValid && v.warning)
    .map((v) => v.warning)
    .filter(Boolean);

  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors[0], // 最初のエラーを返す
    };
  }

  if (warnings.length > 0) {
    return {
      isValid: true,
      warning: warnings[0], // 最初の警告を返す
    };
  }

  return { isValid: true };
}

/**
 * フォーム全体の検証
 *
 * @param formData フォームデータ
 * @returns 検証結果のマップ
 */
export function validateSwapForm(formData: {
  amountIn: string;
  tokenIn: string;
  tokenOut: string;
  slippage: string;
  deadline: string;
}): Record<string, ValidationResult> {
  return {
    amountIn: validateTokenAmount(formData.amountIn),
    tokenIn: validateTokenAddress(formData.tokenIn),
    tokenOut: validateTokenAddress(formData.tokenOut),
    slippage: validateSlippage(formData.slippage),
    deadline: validateDeadline(formData.deadline),
  };
}

/**
 * 流動性フォームの検証
 *
 * @param formData フォームデータ
 * @returns 検証結果のマップ
 */
export function validateLiquidityForm(formData: {
  amountA: string;
  amountB: string;
  tokenA: string;
  tokenB: string;
  slippage: string;
  deadline: string;
}): Record<string, ValidationResult> {
  return {
    amountA: validateTokenAmount(formData.amountA),
    amountB: validateTokenAmount(formData.amountB),
    tokenA: validateTokenAddress(formData.tokenA),
    tokenB: validateTokenAddress(formData.tokenB),
    slippage: validateSlippage(formData.slippage),
    deadline: validateDeadline(formData.deadline),
  };
}
