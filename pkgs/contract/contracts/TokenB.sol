// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenB
 * @dev DEXで使用されるテストトークンB (TKB)
 * @notice フォーセット機能付きのERC20トークン
 */
contract TokenB is ERC20, Ownable, ReentrancyGuard {
    /// @dev フォーセットで1回に取得できるトークン量
    uint256 public constant FAUCET_AMOUNT = 100 * 10**18; // 100 TKB
    
    /// @dev フォーセットの制限時間（24時間）
    uint256 public constant FAUCET_COOLDOWN = 24 hours;
    
    /// @dev 各アドレスの最後のフォーセット利用時刻
    mapping(address => uint256) public lastFaucetTime;
    
    /**
     * @dev フォーセット利用時に発生するイベント
     * @param user フォーセットを利用したユーザーアドレス
     * @param amount 取得したトークン量
     * @param timestamp 利用時刻
     */
    event FaucetUsed(address indexed user, uint256 amount, uint256 timestamp);
    
    /**
     * @dev フォーセット制限エラー
     * @param user 制限にかかったユーザーアドレス
     * @param remainingTime 次回利用まで待機する必要がある時間（秒）
     */
    error FaucetCooldownActive(address user, uint256 remainingTime);
    
    /**
     * @dev コンストラクタ
     * @param initialOwner 初期オーナーアドレス
     */
    constructor(address initialOwner) ERC20("TokenB", "TKB") Ownable(initialOwner) {
        // 初期供給はフォーセットのみで行う
    }
    
    /**
     * @dev フォーセット機能 - 誰でも1日1回100 TKBを取得可能
     * @notice 24時間に1回のみ利用可能
     */
    function faucet() external nonReentrant {
        address user = msg.sender;
        uint256 currentTime = block.timestamp;
        
        // 前回のフォーセット利用から24時間経過しているかチェック
        if (lastFaucetTime[user] + FAUCET_COOLDOWN > currentTime) {
            uint256 remainingTime = (lastFaucetTime[user] + FAUCET_COOLDOWN) - currentTime;
            revert FaucetCooldownActive(user, remainingTime);
        }
        
        // フォーセット利用時刻を更新
        lastFaucetTime[user] = currentTime;
        
        // トークンを発行してユーザーに送付
        _mint(user, FAUCET_AMOUNT);
        
        emit FaucetUsed(user, FAUCET_AMOUNT, currentTime);
    }
    
    /**
     * @dev ユーザーが次にフォーセットを利用できるまでの残り時間を取得
     * @param user 確認するユーザーアドレス
     * @return remainingTime 残り時間（秒）、0の場合は利用可能
     */
    function getFaucetCooldownTime(address user) external view returns (uint256 remainingTime) {
        uint256 currentTime = block.timestamp;
        uint256 lastUsed = lastFaucetTime[user];
        
        if (lastUsed + FAUCET_COOLDOWN > currentTime) {
            return (lastUsed + FAUCET_COOLDOWN) - currentTime;
        }
        
        return 0;
    }
    
    /**
     * @dev ユーザーがフォーセットを利用可能かどうかを確認
     * @param user 確認するユーザーアドレス
     * @return canUse 利用可能な場合はtrue
     */
    function canUseFaucet(address user) external view returns (bool canUse) {
        return lastFaucetTime[user] + FAUCET_COOLDOWN <= block.timestamp;
    }
    
    /**
     * @dev オーナーのみがトークンを発行可能（緊急時用）
     * @param to 発行先アドレス
     * @param amount 発行量
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
