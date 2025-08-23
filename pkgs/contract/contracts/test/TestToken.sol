// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestToken
 * @dev テスト用のシンプルなERC20トークン
 */
contract TestToken is ERC20 {
    /**
     * @dev コンストラクタ
     * @param name トークン名
     * @param symbol トークンシンボル
     * @param initialSupply 初期供給量
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev トークンをミントする（テスト用）
     * @param to ミント先アドレス
     * @param amount ミント数量
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @dev トークンをバーンする（テスト用）
     * @param from バーン元アドレス
     * @param amount バーン数量
     */
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}