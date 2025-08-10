// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./DexPair.sol";

/**
 * @title DexFactory
 * @dev トークンペアの作成と管理を行うファクトリーコントラクト
 * @notice Uniswap V2のファクトリーパターンに基づいた実装
 */
contract DexFactory {
    /// @dev ペア作成手数料の受取人アドレス
    address public feeTo;
    
    /// @dev feeToを設定する権限を持つアドレス
    address public feeToSetter;
    
    /// @dev トークンペアのマッピング (token0 => token1 => pairAddress)
    mapping(address => mapping(address => address)) public getPair;
    
    /// @dev 作成されたペアのアドレス一覧
    address[] public allPairs;
    
    /**
     * @dev ペア作成時に発生するイベント
     * @param token0 ペアの最初のトークンアドレス（アドレスの小さい方）
     * @param token1 ペアの二番目のトークンアドレス（アドレスの大きい方）
     * @param pair 作成されたペアのアドレス
     * @param pairLength 現在のペア総数
     */
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256 pairLength
    );
    
    /**
     * @dev feeTo設定時に発生するイベント
     * @param newFeeTo 新しいfeeToアドレス
     */
    event FeeToUpdated(address indexed newFeeTo);
    
    /**
     * @dev feeToSetter設定時に発生するイベント
     * @param newFeeToSetter 新しいfeeToSetterアドレス
     */
    event FeeToSetterUpdated(address indexed newFeeToSetter);
    
    /**
     * @dev エラー：同一トークンペアの作成
     */
    error IdenticalTokens();
    
    /**
     * @dev エラー：ゼロアドレスの指定
     */
    error ZeroAddress();
    
    /**
     * @dev エラー：既に存在するペア
     */
    error PairAlreadyExists();
    
    /**
     * @dev エラー：権限なし
     */
    error Unauthorized();
    
    /**
     * @dev コンストラクタ
     * @param _feeToSetter feeToSetterの初期アドレス
     */
    constructor(address _feeToSetter) {
        if (_feeToSetter == address(0)) revert ZeroAddress();
        feeToSetter = _feeToSetter;
    }
    
    /**
     * @dev 作成されたペアの総数を取得
     * @return 作成されたペアの総数
     */
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
    
    /**
     * @dev 新しいトークンペアを作成
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 二番目のトークンアドレス
     * @return pair 作成されたペアのアドレス
     */
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        // 同一トークンのチェック
        if (tokenA == tokenB) revert IdenticalTokens();
        
        // トークンアドレスをソート（小さいアドレスをtoken0に）
        (address token0, address token1) = tokenA < tokenB 
            ? (tokenA, tokenB) 
            : (tokenB, tokenA);
        
        // ゼロアドレスのチェック
        if (token0 == address(0)) revert ZeroAddress();
        
        // 既存ペアの確認
        if (getPair[token0][token1] != address(0)) revert PairAlreadyExists();
        
        // ペアコントラクトの作成
        bytes memory bytecode = type(DexPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        
        // ペアの初期化
        DexPair(pair).initialize(token0, token1);
        
        // マッピングの更新
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // 双方向で参照可能にする
        allPairs.push(pair);
        
        emit PairCreated(token0, token1, pair, allPairs.length);
    }
    
    /**
     * @dev feeToアドレスを設定
     * @param _feeTo 新しいfeeToアドレス
     */
    function setFeeTo(address _feeTo) external {
        if (msg.sender != feeToSetter) revert Unauthorized();
        feeTo = _feeTo;
        emit FeeToUpdated(_feeTo);
    }
    
    /**
     * @dev feeToSetterアドレスを設定
     * @param _feeToSetter 新しいfeeToSetterアドレス
     */
    function setFeeToSetter(address _feeToSetter) external {
        if (msg.sender != feeToSetter) revert Unauthorized();
        if (_feeToSetter == address(0)) revert ZeroAddress();
        feeToSetter = _feeToSetter;
        emit FeeToSetterUpdated(_feeToSetter);
    }
    
    /**
     * @dev 特定のペアアドレスを計算（CREATE2を使用）
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 二番目のトークンアドレス
     * @return pair 計算されたペアアドレス
     */
    function pairFor(address tokenA, address tokenB) external view returns (address pair) {
        (address token0, address token1) = tokenA < tokenB 
            ? (tokenA, tokenB) 
            : (tokenB, tokenA);
        
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        bytes32 bytecodeHash = keccak256(type(DexPair).creationCode);
        
        pair = address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            bytecodeHash
        )))));
    }
}
