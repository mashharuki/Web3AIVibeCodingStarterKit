// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IDEXFactory} from "../interfaces/IDEXFactory.sol";
import {IDEXPair} from "../interfaces/IDEXPair.sol";
import {Errors} from "../libraries/Errors.sol";
import {DEXPair} from "./DEXPair.sol";

/**
 * @title DEXFactory
 * @dev UniswapライクなAMM DEXのファクトリーコントラクト
 * 新しい流動性ペアの作成と管理を行う
 */
contract DEXFactory is IDEXFactory, Ownable, ReentrancyGuard {
    /// @dev 手数料受取先アドレス
    address public override feeTo;

    /// @dev 手数料設定者アドレス
    address public override feeToSetter;

    /// @dev トークンペアからペアアドレスへのマッピング
    mapping(address => mapping(address => address)) public override getPair;

    /// @dev 作成された全ペアのアドレス配列
    address[] public override allPairs;

    /**
     * @dev コンストラクタ
     * @param _feeToSetter 手数料設定者のアドレス
     */
    constructor(address _feeToSetter) Ownable(msg.sender) {
        if (_feeToSetter == address(0)) revert Errors.ZeroAddress();
        feeToSetter = _feeToSetter;
    }

    /**
     * @dev 作成された全ペアの数を取得する
     * @return length 総ペア数
     */
    function allPairsLength() external view override returns (uint256 length) {
        return allPairs.length;
    }

    /**
     * @dev 新しい流動性ペアを作成する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @return pair 作成されたペアコントラクトのアドレス
     */
    function createPair(address tokenA, address tokenB)
        external
        override
        nonReentrant
        returns (address pair)
    {
        // 入力検証
        if (tokenA == tokenB) revert Errors.IdenticalAddresses();
        if (tokenA == address(0) || tokenB == address(0)) revert Errors.ZeroAddress();

        // トークンアドレスをソート（token0 < token1）
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        // ペアが既に存在しないことを確認
        if (getPair[token0][token1] != address(0)) revert Errors.PairExists();

        // ペアコントラクトをデプロイ
        bytes memory bytecode = type(DEXPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        // ペアコントラクトを初期化
        IDEXPair(pair).initialize(token0, token1);

        // マッピングを更新
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // 双方向マッピング
        allPairs.push(pair);

        // イベントを発行
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    /**
     * @dev 手数料受取先を設定する（手数料設定者のみ実行可能）
     * @param newFeeTo 新しい手数料受取先アドレス
     */
    function setFeeTo(address newFeeTo) external override {
        if (msg.sender != feeToSetter) revert Errors.Forbidden();
        
        address oldFeeTo = feeTo;
        feeTo = newFeeTo;
        
        emit FeeToChanged(oldFeeTo, newFeeTo);
    }

    /**
     * @dev 手数料設定者を変更する（現在の手数料設定者のみ実行可能）
     * @param newFeeToSetter 新しい手数料設定者アドレス
     */
    function setFeeToSetter(address newFeeToSetter) external override {
        if (msg.sender != feeToSetter) revert Errors.Forbidden();
        if (newFeeToSetter == address(0)) revert Errors.ZeroAddress();
        
        address oldFeeToSetter = feeToSetter;
        feeToSetter = newFeeToSetter;
        
        emit FeeToSetterChanged(oldFeeToSetter, newFeeToSetter);
    }

    /**
     * @dev ペアアドレスを事前計算する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @return pair 計算されたペアアドレス
     */
    function pairFor(address tokenA, address tokenB) external view returns (address pair) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        pair = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            hex"ff",
                            address(this),
                            keccak256(abi.encodePacked(token0, token1)),
                            keccak256(type(DEXPair).creationCode)
                        )
                    )
                )
            )
        );
    }

    /**
     * @dev 指定されたペアが存在するかを確認する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @return exists ペアが存在するかどうか
     */
    function pairExists(address tokenA, address tokenB) external view returns (bool exists) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return getPair[token0][token1] != address(0);
    }

    /**
     * @dev 全ペアのアドレスを取得する
     * @return pairs 全ペアアドレスの配列
     */
    function getAllPairs() external view returns (address[] memory pairs) {
        return allPairs;
    }

    /**
     * @dev 指定された範囲のペアアドレスを取得する
     * @param start 開始インデックス
     * @param end 終了インデックス
     * @return pairs 指定範囲のペアアドレス配列
     */
    function getPairs(uint256 start, uint256 end) external view returns (address[] memory pairs) {
        if (start >= allPairs.length) revert Errors.InvalidAmount();
        if (end > allPairs.length) end = allPairs.length;
        if (start >= end) revert Errors.InvalidAmount();

        pairs = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            pairs[i - start] = allPairs[i];
        }
    }

    /**
     * @dev 緊急時にファクトリーを一時停止する（オーナーのみ）
     * 注意: この機能は緊急時のみ使用し、通常は使用しない
     */
    function emergencyPause() external onlyOwner {
        // 実装は将来の拡張用に予約
        // 現在のバージョンでは一時停止機能は実装しない
        revert Errors.NotInitialized();
    }
}