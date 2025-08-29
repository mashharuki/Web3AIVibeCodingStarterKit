// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IAMMPair.sol";
import "../interfaces/IAMMFactory.sol";

/**
 * @title AMMLibrary
 * @dev AMM価格計算ライブラリ
 */
library AMMLibrary {
  // トークンアドレスをソート
  function sortTokens(
    address tokenA,
    address tokenB
  ) internal pure returns (address token0, address token1) {
    require(tokenA != tokenB, "AMMLibrary: IDENTICAL_ADDRESSES");
    (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    require(token0 != address(0), "AMMLibrary: ZERO_ADDRESS");
  }

  // ペアアドレスを計算
  function pairFor(
    address factory,
    address tokenA,
    address tokenB
  ) internal view returns (address pair) {
    (address token0, address token1) = sortTokens(tokenA, tokenB);
    pair = IAMMFactory(factory).getPair(token0, token1);
  }

  // 残高を取得
  function getReserves(
    address factory,
    address tokenA,
    address tokenB
  ) internal view returns (uint reserveA, uint reserveB) {
    (address token0, ) = sortTokens(tokenA, tokenB);
    (uint reserve0, uint reserve1, ) = IAMMPair(pairFor(factory, tokenA, tokenB)).getReserves();
    (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
  }

  // 指定された入力量に対する出力量を計算
  function getAmountOut(
    uint amountIn,
    uint reserveIn,
    uint reserveOut
  ) internal pure returns (uint amountOut) {
    require(amountIn > 0, "AMMLibrary: INSUFFICIENT_INPUT_AMOUNT");
    require(reserveIn > 0 && reserveOut > 0, "AMMLibrary: INSUFFICIENT_LIQUIDITY");
    uint amountInWithFee = amountIn * 997;
    uint numerator = amountInWithFee * reserveOut;
    uint denominator = reserveIn * 1000 + amountInWithFee;
    amountOut = numerator / denominator;
  }

  // 指定された出力量に対する入力量を計算
  function getAmountIn(
    uint amountOut,
    uint reserveIn,
    uint reserveOut
  ) internal pure returns (uint amountIn) {
    require(amountOut > 0, "AMMLibrary: INSUFFICIENT_OUTPUT_AMOUNT");
    require(reserveIn > 0 && reserveOut > 0, "AMMLibrary: INSUFFICIENT_LIQUIDITY");
    uint numerator = reserveIn * amountOut * 1000;
    uint denominator = (reserveOut - amountOut) * 997;
    amountIn = (numerator / denominator) + 1;
  }

  // パス全体の出力量を計算
  function getAmountsOut(
    address factory,
    uint amountIn,
    address[] memory path
  ) internal view returns (uint[] memory amounts) {
    require(path.length >= 2, "AMMLibrary: INVALID_PATH");
    amounts = new uint[](path.length);
    amounts[0] = amountIn;
    for (uint i; i < path.length - 1; i++) {
      (uint reserveIn, uint reserveOut) = getReserves(factory, path[i], path[i + 1]);
      amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
    }
  }

  // パス全体の入力量を計算
  function getAmountsIn(
    address factory,
    uint amountOut,
    address[] memory path
  ) internal view returns (uint[] memory amounts) {
    require(path.length >= 2, "AMMLibrary: INVALID_PATH");
    amounts = new uint[](path.length);
    amounts[amounts.length - 1] = amountOut;
    for (uint i = path.length - 1; i > 0; i--) {
      (uint reserveIn, uint reserveOut) = getReserves(factory, path[i - 1], path[i]);
      amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
    }
  }

  // 流動性追加時の最適な数量を計算
  function quote(uint amountA, uint reserveA, uint reserveB) internal pure returns (uint amountB) {
    require(amountA > 0, "AMMLibrary: INSUFFICIENT_AMOUNT");
    require(reserveA > 0 && reserveB > 0, "AMMLibrary: INSUFFICIENT_LIQUIDITY");
    amountB = (amountA * reserveB) / reserveA;
  }
}
