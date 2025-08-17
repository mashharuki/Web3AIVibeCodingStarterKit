// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "../interfaces/IERC20.sol";
import {ITestTokenFaucet} from "../interfaces/ITestTokenFaucet.sol";

/**
 * @title MaliciousToken
 * @dev A malicious ERC20 token that attempts reentrancy attacks on the faucet
 * @notice This contract is for testing purposes only
 */
contract MaliciousToken is IERC20 {
    string public name = "Malicious Token";
    string public symbol = "MAL";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    ITestTokenFaucet public faucet;
    bool public attacking = false;
    uint256 public attackCount = 0;
    
    constructor(address _faucet) {
        faucet = ITestTokenFaucet(_faucet);
    }
    
    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        address owner = msg.sender;
        _transfer(owner, to, amount);
        
        // Attempt reentrancy during transfer (this should be blocked by ReentrancyGuard)
        if (attacking && attackCount < 2 && to == address(faucet)) {
            attackCount++;
            try faucet.requestTokens(address(this), 1) {
                // Should fail due to reentrancy protection
            } catch {
                // Expected to fail
            }
        }
        
        return true;
    }
    
    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        address owner = msg.sender;
        _approve(owner, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        address spender = msg.sender;
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }
    
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        
        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        
        _balances[from] = fromBalance - amount;
        _balances[to] += amount;
        
        emit Transfer(from, to, amount);
    }
    
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    function _spendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 currentAllowance = _allowances[owner][spender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            _approve(owner, spender, currentAllowance - amount);
        }
    }
    
    function startAttack() external {
        attacking = true;
        attackCount = 0;
    }
    
    function stopAttack() external {
        attacking = false;
        attackCount = 0;
    }
}