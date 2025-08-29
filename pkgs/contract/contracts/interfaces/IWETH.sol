// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IWETH
 * @dev Wrapped Ether インターフェース
 */
interface IWETH {
  function deposit() external payable;
  function transfer(address to, uint value) external returns (bool);
  function withdraw(uint) external;
}
