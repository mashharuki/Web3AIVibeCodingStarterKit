// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IAMMRouter.sol";
import "../interfaces/IAMMFactory.sol";
import "../interfaces/IAMMPair.sol";
import "../libraries/AMMLibrary.sol";
import "../interfaces/IWETH.sol";

/**
 * @title AMMRouter
 * @dev AMM Router コントラクト - スワップと流動性管理機能を提供
 */
contract AMMRouter is IAMMRouter, ReentrancyGuard {
  address public immutable override factory;
  address public immutable override WETH;

  modifier ensure(uint deadline) {
    require(deadline >= block.timestamp, "AMMRouter: EXPIRED");
    _;
  }

  /**
   * @dev コンストラクタ
   * @param _factory Factoryコントラクトのアドレス
   * @param _WETH WETHコントラクトのアドレス
   */
  constructor(address _factory, address _WETH) {
    factory = _factory;
    WETH = _WETH;
  }

  receive() external payable {
    assert(msg.sender == WETH); // WETHからのETH受け取りのみ
  }

  /**
   * 流動性追加メソッド
   * @param tokenA トークンAのアドレス
   * @param tokenB トークンBのアドレス
   * @param amountADesired 追加したいトークンAの量
   * @param amountBDesired 追加したいトークンBの量
   * @param amountAMin 許容できるトークンAの最小量
   * @param amountBMin 許容できるトークンBの最小量
   * @return amountA 実際に追加されるトークンAの量
   * @return amountB 実際に追加されるトークンBの量
   */
  function _addLiquidity(
    address tokenA,
    address tokenB,
    uint amountADesired,
    uint amountBDesired,
    uint amountAMin,
    uint amountBMin
  ) internal virtual returns (uint amountA, uint amountB) {
    // ペアが存在しない場合は作成
    if (IAMMFactory(factory).getPair(tokenA, tokenB) == address(0)) {
      IAMMFactory(factory).createPair(tokenA, tokenB);
    }
    (uint reserveA, uint reserveB) = AMMLibrary.getReserves(factory, tokenA, tokenB);
    if (reserveA == 0 && reserveB == 0) {
      (amountA, amountB) = (amountADesired, amountBDesired);
    } else {
      uint amountBOptimal = AMMLibrary.quote(amountADesired, reserveA, reserveB);
      if (amountBOptimal <= amountBDesired) {
        require(amountBOptimal >= amountBMin, "AMMRouter: INSUFFICIENT_B_AMOUNT");
        (amountA, amountB) = (amountADesired, amountBOptimal);
      } else {
        uint amountAOptimal = AMMLibrary.quote(amountBDesired, reserveB, reserveA);
        assert(amountAOptimal <= amountADesired);
        require(amountAOptimal >= amountAMin, "AMMRouter: INSUFFICIENT_A_AMOUNT");
        (amountA, amountB) = (amountAOptimal, amountBDesired);
      }
    }
  }

  /**
   * 流動性追加メソッド
   * @param tokenA トークンAのアドレス
   * @param tokenB トークンBのアドレス
   * @param amountADesired 追加したいトークンAの量
   * @param amountBDesired 追加したいトークンBの量
   * @param amountAMin 許容できるトークンAの最小量
   * @param amountBMin 許容できるトークンBの最小量
   * @param to 流動性トークンの受け取りアドレス
   * @param deadline 取引期限のタイムスタンプ
   * @return amountA 実際に追加されるトークンAの量
   * @return amountB 実際に追加されるトークンBの量
   * @return liquidity 発行される流動性トークンの量
   */
  function addLiquidity(
    address tokenA,
    address tokenB,
    uint amountADesired,
    uint amountBDesired,
    uint amountAMin,
    uint amountBMin,
    address to,
    uint deadline
  )
    external
    virtual
    override
    ensure(deadline)
    nonReentrant
    returns (uint amountA, uint amountB, uint liquidity)
  {
    (amountA, amountB) = _addLiquidity(
      tokenA,
      tokenB,
      amountADesired,
      amountBDesired,
      amountAMin,
      amountBMin
    );
    address pair = AMMLibrary.pairFor(factory, tokenA, tokenB);
    _safeTransferFrom(tokenA, msg.sender, pair, amountA);
    _safeTransferFrom(tokenB, msg.sender, pair, amountB);
    liquidity = IAMMPair(pair).mint(to);
  }

  function addLiquidityETH(
    address token,
    uint amountTokenDesired,
    uint amountTokenMin,
    uint amountETHMin,
    address to,
    uint deadline
  )
    external
    payable
    virtual
    override
    ensure(deadline)
    nonReentrant
    returns (uint amountToken, uint amountETH, uint liquidity)
  {
    (amountToken, amountETH) = _addLiquidity(
      token,
      WETH,
      amountTokenDesired,
      msg.value,
      amountTokenMin,
      amountETHMin
    );
    address pair = AMMLibrary.pairFor(factory, token, WETH);
    _safeTransferFrom(token, msg.sender, pair, amountToken);
    IWETH(WETH).deposit{value: amountETH}();
    assert(IWETH(WETH).transfer(pair, amountETH));
    liquidity = IAMMPair(pair).mint(to);
    // 余剰ETHを返金
    if (msg.value > amountETH) _safeTransferETH(msg.sender, msg.value - amountETH);
  }

  /**
   * 流動性削除メソッド
   */
  function removeLiquidity(
    address tokenA,
    address tokenB,
    uint liquidity,
    uint amountAMin,
    uint amountBMin,
    address to,
    uint deadline
  ) public virtual override ensure(deadline) nonReentrant returns (uint amountA, uint amountB) {
    address pair = AMMLibrary.pairFor(factory, tokenA, tokenB);
    IAMMPair(pair).transferFrom(msg.sender, pair, liquidity); // LPトークンをペアに送信
    (uint amount0, uint amount1) = IAMMPair(pair).burn(to);
    (address token0, ) = AMMLibrary.sortTokens(tokenA, tokenB);
    (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
    require(amountA >= amountAMin, "AMMRouter: INSUFFICIENT_A_AMOUNT");
    require(amountB >= amountBMin, "AMMRouter: INSUFFICIENT_B_AMOUNT");
  }

  function removeLiquidityETH(
    address token,
    uint liquidity,
    uint amountTokenMin,
    uint amountETHMin,
    address to,
    uint deadline
  )
    public
    virtual
    override
    ensure(deadline)
    nonReentrant
    returns (uint amountToken, uint amountETH)
  {
    (amountToken, amountETH) = removeLiquidity(
      token,
      WETH,
      liquidity,
      amountTokenMin,
      amountETHMin,
      address(this),
      deadline
    );
    _safeTransfer(token, to, amountToken);
    IWETH(WETH).withdraw(amountETH);
    _safeTransferETH(to, amountETH);
  }

  /**
   * 内部スワップ関数
   * @param amounts swapする量
   * @param path swapするトークンのpair情報
   * @param _to 送金先のアドレス
   */
  function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
    for (uint i; i < path.length - 1; i++) {
      (address input, address output) = (path[i], path[i + 1]);
      (address token0, ) = AMMLibrary.sortTokens(input, output);
      uint amountOut = amounts[i + 1];
      (uint amount0Out, uint amount1Out) = input == token0
        ? (uint(0), amountOut)
        : (amountOut, uint(0));
      address to = i < path.length - 2 ? AMMLibrary.pairFor(factory, output, path[i + 2]) : _to;
      IAMMPair(AMMLibrary.pairFor(factory, input, output)).swap(
        amount0Out,
        amount1Out,
        to,
        new bytes(0)
      );
    }
  }

  /**
   * swapメソッド
   * @param amountIn スワップするトークンの量
   * @param amountOutMin 受け取るトークンの最小量
   * @param path スワップするトークンのパス配列
   * @param to スワップしたトークンの送金先アドレス
   * @param deadline 取引期限のタイムスタンプ
   */
  function swapExactTokensForTokens(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
  ) external virtual override ensure(deadline) nonReentrant returns (uint[] memory amounts) {
    amounts = AMMLibrary.getAmountsOut(factory, amountIn, path);
    require(amounts[amounts.length - 1] >= amountOutMin, "AMMRouter: INSUFFICIENT_OUTPUT_AMOUNT");
    _safeTransferFrom(
      path[0],
      msg.sender,
      AMMLibrary.pairFor(factory, path[0], path[1]),
      amounts[0]
    );
    // 内部メソッドのb呼び出し
    _swap(amounts, path, to);
  }

  function swapTokensForExactTokens(
    uint amountOut,
    uint amountInMax,
    address[] calldata path,
    address to,
    uint deadline
  ) external virtual override ensure(deadline) nonReentrant returns (uint[] memory amounts) {
    amounts = AMMLibrary.getAmountsIn(factory, amountOut, path);
    require(amounts[0] <= amountInMax, "AMMRouter: EXCESSIVE_INPUT_AMOUNT");
    _safeTransferFrom(
      path[0],
      msg.sender,
      AMMLibrary.pairFor(factory, path[0], path[1]),
      amounts[0]
    );
    _swap(amounts, path, to);
  }

  function swapExactETHForTokens(
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
  )
    external
    payable
    virtual
    override
    ensure(deadline)
    nonReentrant
    returns (uint[] memory amounts)
  {
    require(path[0] == WETH, "AMMRouter: INVALID_PATH");
    amounts = AMMLibrary.getAmountsOut(factory, msg.value, path);
    require(amounts[amounts.length - 1] >= amountOutMin, "AMMRouter: INSUFFICIENT_OUTPUT_AMOUNT");
    IWETH(WETH).deposit{value: amounts[0]}();
    assert(IWETH(WETH).transfer(AMMLibrary.pairFor(factory, path[0], path[1]), amounts[0]));
    _swap(amounts, path, to);
  }

  function swapTokensForExactETH(
    uint amountOut,
    uint amountInMax,
    address[] calldata path,
    address to,
    uint deadline
  ) external virtual override ensure(deadline) nonReentrant returns (uint[] memory amounts) {
    require(path[path.length - 1] == WETH, "AMMRouter: INVALID_PATH");
    amounts = AMMLibrary.getAmountsIn(factory, amountOut, path);
    require(amounts[0] <= amountInMax, "AMMRouter: EXCESSIVE_INPUT_AMOUNT");
    _safeTransferFrom(
      path[0],
      msg.sender,
      AMMLibrary.pairFor(factory, path[0], path[1]),
      amounts[0]
    );
    _swap(amounts, path, address(this));
    IWETH(WETH).withdraw(amounts[amounts.length - 1]);
    _safeTransferETH(to, amounts[amounts.length - 1]);
  }

  function swapExactTokensForETH(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
  ) external virtual override ensure(deadline) nonReentrant returns (uint[] memory amounts) {
    require(path[path.length - 1] == WETH, "AMMRouter: INVALID_PATH");
    amounts = AMMLibrary.getAmountsOut(factory, amountIn, path);
    require(amounts[amounts.length - 1] >= amountOutMin, "AMMRouter: INSUFFICIENT_OUTPUT_AMOUNT");
    _safeTransferFrom(
      path[0],
      msg.sender,
      AMMLibrary.pairFor(factory, path[0], path[1]),
      amounts[0]
    );
    _swap(amounts, path, address(this));
    IWETH(WETH).withdraw(amounts[amounts.length - 1]);
    _safeTransferETH(to, amounts[amounts.length - 1]);
  }

  function swapETHForExactTokens(
    uint amountOut,
    address[] calldata path,
    address to,
    uint deadline
  )
    external
    payable
    virtual
    override
    ensure(deadline)
    nonReentrant
    returns (uint[] memory amounts)
  {
    require(path[0] == WETH, "AMMRouter: INVALID_PATH");
    amounts = AMMLibrary.getAmountsIn(factory, amountOut, path);
    require(amounts[0] <= msg.value, "AMMRouter: EXCESSIVE_INPUT_AMOUNT");
    IWETH(WETH).deposit{value: amounts[0]}();
    assert(IWETH(WETH).transfer(AMMLibrary.pairFor(factory, path[0], path[1]), amounts[0]));
    _swap(amounts, path, to);
    // 余剰ETHを返金
    if (msg.value > amounts[0]) _safeTransferETH(msg.sender, msg.value - amounts[0]);
  }

  // **** ライブラリ関数 ****
  function quote(
    uint amountA,
    uint reserveA,
    uint reserveB
  ) public pure virtual override returns (uint amountB) {
    return AMMLibrary.quote(amountA, reserveA, reserveB);
  }

  function getAmountOut(
    uint amountIn,
    uint reserveIn,
    uint reserveOut
  ) public pure virtual override returns (uint amountOut) {
    return AMMLibrary.getAmountOut(amountIn, reserveIn, reserveOut);
  }

  function getAmountIn(
    uint amountOut,
    uint reserveIn,
    uint reserveOut
  ) public pure virtual override returns (uint amountIn) {
    return AMMLibrary.getAmountIn(amountOut, reserveIn, reserveOut);
  }

  function getAmountsOut(
    uint amountIn,
    address[] memory path
  ) public view virtual override returns (uint[] memory amounts) {
    return AMMLibrary.getAmountsOut(factory, amountIn, path);
  }

  function getAmountsIn(
    uint amountOut,
    address[] memory path
  ) public view virtual override returns (uint[] memory amounts) {
    return AMMLibrary.getAmountsIn(factory, amountOut, path);
  }

  // **** ヘルパー関数 ****
  function _safeTransfer(address token, address to, uint value) internal {
    (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
    require(
      success && (data.length == 0 || abi.decode(data, (bool))),
      "AMMRouter: TRANSFER_FAILED"
    );
  }

  function _safeTransferFrom(address token, address from, address to, uint value) internal {
    (bool success, bytes memory data) = token.call(
      abi.encodeWithSelector(0x23b872dd, from, to, value)
    );
    require(
      success && (data.length == 0 || abi.decode(data, (bool))),
      "AMMRouter: TRANSFER_FROM_FAILED"
    );
  }

  function _safeTransferETH(address to, uint value) internal {
    (bool success, ) = to.call{value: value}(new bytes(0));
    require(success, "AMMRouter: ETH_TRANSFER_FAILED");
  }
}
