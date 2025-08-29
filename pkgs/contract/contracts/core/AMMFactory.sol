// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IAMMFactory.sol";
import "./AMMPair.sol";

/**
 * @title AMMFactory コントラクト
 * @dev AMM ペア作成・管理コントラクト
 */
contract AMMFactory is IAMMFactory {
  // 状態変数
  address public override feeTo;
  address public override feeToSetter;

  mapping(address => mapping(address => address)) public override getPair;
  address[] public override allPairs;

  /**
   * @dev コンストラクタ
   * @param _feeToSetter 手数料設定者のアドレス
   */
  constructor(address _feeToSetter) {
    feeToSetter = _feeToSetter;
  }

  /**
   * @dev 全ペア数を取得
   * @return 作成されたペアの総数
   */
  function allPairsLength() external view override returns (uint) {
    return allPairs.length;
  }

  /**
   * @dev 新しいペアを作成
   * @param tokenA トークンAのアドレス
   * @param tokenB トークンBのアドレス
   * @return pair 作成されたペアのアドレス
   */
  function createPair(address tokenA, address tokenB) external override returns (address pair) {
    require(tokenA != tokenB, "AMMFactory: IDENTICAL_ADDRESSES");

    // トークンアドレスをソート（token0 < token1）
    (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    require(token0 != address(0), "AMMFactory: ZERO_ADDRESS");
    require(getPair[token0][token1] == address(0), "AMMFactory: PAIR_EXISTS");

    // ペアコントラクトをデプロイ
    bytes memory bytecode = type(AMMPair).creationCode;
    bytes32 salt = keccak256(abi.encodePacked(token0, token1));

    assembly {
      pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
    }

    // ペアを初期化
    IAMMPair(pair).initialize(token0, token1);

    // マッピングに追加
    getPair[token0][token1] = pair;
    getPair[token1][token0] = pair; // 逆方向も追加
    allPairs.push(pair);

    emit PairCreated(token0, token1, pair, allPairs.length);
  }

  /**
   * @dev 手数料受取先を設定
   * @param _feeTo 新しい手数料受取先アドレス
   */
  function setFeeTo(address _feeTo) external override {
    require(msg.sender == feeToSetter, "AMMFactory: FORBIDDEN");
    feeTo = _feeTo;
  }

  /**
   * @dev 手数料設定者を変更
   * @param _feeToSetter 新しい手数料設定者アドレス
   */
  function setFeeToSetter(address _feeToSetter) external override {
    require(msg.sender == feeToSetter, "AMMFactory: FORBIDDEN");
    feeToSetter = _feeToSetter;
  }

  /**
   * @dev ペアアドレスを決定論的に計算
   * @param tokenA トークンAのアドレス
   * @param tokenB トークンBのアドレス
   * @return pair 計算されたペアアドレス
   */
  function pairFor(address tokenA, address tokenB) external view returns (address pair) {
    (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    pair = address(
      uint160(
        uint(
          keccak256(
            abi.encodePacked(
              hex"ff",
              address(this),
              keccak256(abi.encodePacked(token0, token1)),
              keccak256(type(AMMPair).creationCode)
            )
          )
        )
      )
    );
  }
}
