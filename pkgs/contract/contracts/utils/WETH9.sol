// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IWETH.sol";

/**
 * @title WETH9
 * @dev Wrapped Ether implementation for testing
 */
contract WETH9 is IWETH {
  string public name = "Wrapped Ether";
  string public symbol = "WETH";
  uint8 public decimals = 18;

  mapping(address => uint) public balanceOf;
  mapping(address => mapping(address => uint)) public allowance;

  event Approval(address indexed src, address indexed guy, uint wad);
  event Transfer(address indexed src, address indexed dst, uint wad);
  event Deposit(address indexed dst, uint wad);
  event Withdrawal(address indexed src, uint wad);

  receive() external payable {
    deposit();
  }

  function deposit() public payable override {
    balanceOf[msg.sender] += msg.value;
    emit Deposit(msg.sender, msg.value);
  }

  function withdraw(uint wad) public override {
    require(balanceOf[msg.sender] >= wad, "WETH: insufficient balance");
    balanceOf[msg.sender] -= wad;
    payable(msg.sender).transfer(wad);
    emit Withdrawal(msg.sender, wad);
  }

  function totalSupply() public view returns (uint) {
    return address(this).balance;
  }

  function approve(address guy, uint wad) public returns (bool) {
    allowance[msg.sender][guy] = wad;
    emit Approval(msg.sender, guy, wad);
    return true;
  }

  function transfer(address dst, uint wad) public override returns (bool) {
    return transferFrom(msg.sender, dst, wad);
  }

  function transferFrom(address src, address dst, uint wad) public returns (bool) {
    require(balanceOf[src] >= wad, "WETH: insufficient balance");

    if (src != msg.sender && allowance[src][msg.sender] != type(uint).max) {
      require(allowance[src][msg.sender] >= wad, "WETH: insufficient allowance");
      allowance[src][msg.sender] -= wad;
    }

    balanceOf[src] -= wad;
    balanceOf[dst] += wad;

    emit Transfer(src, dst, wad);

    return true;
  }
}
