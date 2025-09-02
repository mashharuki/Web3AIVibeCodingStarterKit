// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./interfaces/IAMMFactory.sol";
import "./interfaces/IAMMPair.sol";
import "./AMMPair.sol";

/**
 * @title AMMFactory
 * @dev AMM Factory コントラクトの実装
 * 新しい取引ペアの作成と管理を行う
 * Uniswap V2 Factoryを参考にした実装
 */
contract AMMFactory is IAMMFactory {
    // 手数料受取人のアドレス
    address public override feeTo;
    
    // 手数料設定者のアドレス
    address public override feeToSetter;

    // トークンペアのマッピング（tokenA => tokenB => pairAddress）
    mapping(address => mapping(address => address)) public override getPair;
    
    // 全ペアのアドレス配列
    address[] public override allPairs;

    /**
     * @dev コンストラクタ
     * @param _feeToSetter 手数料設定者のアドレス
     */
    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    /**
     * @dev 全ペア数を取得する
     * @return length 総ペア数
     */
    function allPairsLength() external view override returns (uint256 length) {
        return allPairs.length;
    }

    /**
     * @dev 新しい取引ペアを作成する
     * @param tokenA 最初のトークンアドレス
     * @param tokenB 2番目のトークンアドレス
     * @return pair 作成されたペアコントラクトのアドレス
     */
    function createPair(address tokenA, address tokenB)
        external
        override
        returns (address pair)
    {
        // 同じトークンでペアを作成することはできない
        require(tokenA != tokenB, "AMMFactory: IDENTICAL_ADDRESSES");
        
        // トークンアドレスを昇順にソート（token0 < token1）
        (address token0, address token1) = tokenA < tokenB 
            ? (tokenA, tokenB) 
            : (tokenB, tokenA);
        
        // ゼロアドレスは許可しない
        require(token0 != address(0), "AMMFactory: ZERO_ADDRESS");
        
        // 既にペアが存在しないことを確認
        require(getPair[token0][token1] == address(0), "AMMFactory: PAIR_EXISTS");

        // ペアコントラクトのバイトコードを取得
        bytes memory bytecode = type(AMMPair).creationCode;
        
        // CREATE2を使用してペアコントラクトをデプロイ
        // ソルト値はtoken0とtoken1のハッシュ
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        
        // デプロイが成功したことを確認
        require(pair != address(0), "AMMFactory: FAILED_TO_CREATE_PAIR");

        // ペアコントラクトを初期化
        IAMMPair(pair).initialize(token0, token1);

        // マッピングに追加（双方向）
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        
        // 配列に追加
        allPairs.push(pair);

        // イベントを発行
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    /**
     * @dev 手数料受取人を設定する（feeToSetterのみ実行可能）
     * @param _feeTo 新しい手数料受取人のアドレス
     */
    function setFeeTo(address _feeTo) external override {
        require(msg.sender == feeToSetter, "AMMFactory: FORBIDDEN");
        feeTo = _feeTo;
    }

    /**
     * @dev 手数料設定者を変更する（現在のfeeToSetterのみ実行可能）
     * @param _feeToSetter 新しい手数料設定者のアドレス
     */
    function setFeeToSetter(address _feeToSetter) external override {
        require(msg.sender == feeToSetter, "AMMFactory: FORBIDDEN");
        feeToSetter = _feeToSetter;
    }
}