// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAMMFactory
 * @dev AMM Factoryのインターフェース
 */
interface IAMMFactory {
  // イベント
  event PairCreated(address indexed token0, address indexed token1, address pair, uint);

  // 読み取り専用関数
  function feeTo() external view returns (address);
  function feeToSetter() external view returns (address);
  function getPair(address tokenA, address tokenB) external view returns (address pair);
  function allPairs(uint) external view returns (address pair);
  function allPairsLength() external view returns (uint);

  // 状態変更関数
  function createPair(address tokenA, address tokenB) external returns (address pair);
  function setFeeTo(address) external;
  function setFeeToSetter(address) external;
}
