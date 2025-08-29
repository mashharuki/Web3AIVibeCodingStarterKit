// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IAMMPair.sol";
import "../interfaces/IAMMFactory.sol";

/**
 * @title AMMPair
 * @dev AMM流動性ペアコントラクト - ERC20ベースのLPトークン機能を提供
 */
contract AMMPair is IAMMPair, ERC20, ReentrancyGuard {
  using Math for uint256;

  // 定数
  uint public constant override MINIMUM_LIQUIDITY = 10 ** 3;
  bytes4 private constant SELECTOR = bytes4(keccak256(bytes("transfer(address,uint256)")));

  // 状態変数
  address public override factory;
  address public override token0;
  address public override token1;

  uint112 private reserve0; // トークン0の残高
  uint112 private reserve1; // トークン1の残高
  uint32 private blockTimestampLast; // 最後の更新ブロックタイムスタンプ

  uint public override price0CumulativeLast;
  uint public override price1CumulativeLast;
  uint public override kLast; // reserve0 * reserve1（手数料がオンの場合）

  // ロック機構
  uint private unlocked = 1;
  modifier lock() {
    require(unlocked == 1, "AMMPair: LOCKED");
    unlocked = 0;
    _;
    unlocked = 1;
  }

  /**
   * @dev コンストラクタ
   */
  constructor() ERC20("AMM LP Token", "AMM-LP") {
    factory = msg.sender;
  }

  /**
   * @dev ペアの初期化
   * @param _token0 トークン0のアドレス
   * @param _token1 トークン1のアドレス
   */
  function initialize(address _token0, address _token1) external override {
    require(msg.sender == factory, "AMMPair: FORBIDDEN");
    token0 = _token0;
    token1 = _token1;
  }

  /**
   * @dev 現在の残高を取得
   * @return _reserve0 トークン0の残高
   * @return _reserve1 トークン1の残高
   * @return _blockTimestampLast 最後の更新タイムスタンプ
   */
  function getReserves()
    public
    view
    override
    returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)
  {
    _reserve0 = reserve0;
    _reserve1 = reserve1;
    _blockTimestampLast = blockTimestampLast;
  }

  /**
   * @dev 安全なトークン転送
   * @param token トークンアドレス
   * @param to 送信先アドレス
   * @param value 送信量
   */
  function _safeTransfer(address token, address to, uint value) private {
    (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
    require(success && (data.length == 0 || abi.decode(data, (bool))), "AMMPair: TRANSFER_FAILED");
  }

  /**
   * @dev 残高を更新し、価格累積値を計算
   * @param balance0 トークン0の新しい残高
   * @param balance1 トークン1の新しい残高
   * @param _reserve0 トークン0の古い残高
   * @param _reserve1 トークン1の古い残高
   */
  function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
    require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "AMMPair: OVERFLOW");
    uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
    uint32 timeElapsed = blockTimestamp - blockTimestampLast; // オーバーフローは意図的

    if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
      // * は決してオーバーフローしない、+ はオーバーフローが意図的
      price0CumulativeLast +=
        uint(UQ112x112.uqdiv(UQ112x112.encode(_reserve1), _reserve0)) * timeElapsed;
      price1CumulativeLast +=
        uint(UQ112x112.uqdiv(UQ112x112.encode(_reserve0), _reserve1)) * timeElapsed;
    }

    reserve0 = uint112(balance0);
    reserve1 = uint112(balance1);
    blockTimestampLast = blockTimestamp;
    emit Sync(reserve0, reserve1);
  }

  /**
   * @dev 流動性トークンをミント
   * @param to ミント先アドレス
   * @return liquidity ミントされた流動性トークン量
   */
  function mint(address to) external override lock nonReentrant returns (uint liquidity) {
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves(); // ガス節約
    uint balance0 = IERC20(token0).balanceOf(address(this));
    uint balance1 = IERC20(token1).balanceOf(address(this));
    uint amount0 = balance0 - _reserve0;
    uint amount1 = balance1 - _reserve1;

    bool feeOn = _mintFee(_reserve0, _reserve1);
    uint _totalSupply = totalSupply(); // ガス節約、_mintFeeの後に呼び出す必要がある

    if (_totalSupply == 0) {
      // 初回流動性追加
      liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
      _mint(address(0xdead), MINIMUM_LIQUIDITY); // 永続的にロック
    } else {
      // 既存プールへの流動性追加
      liquidity = Math.min(
        (amount0 * _totalSupply) / _reserve0,
        (amount1 * _totalSupply) / _reserve1
      );
    }

    require(liquidity > 0, "AMMPair: INSUFFICIENT_LIQUIDITY_MINTED");
    _mint(to, liquidity);

    _update(balance0, balance1, _reserve0, _reserve1);
    if (feeOn) kLast = uint(reserve0) * reserve1; // reserve0とreserve1は最新
    emit Mint(msg.sender, amount0, amount1);
  }

  /**
   * @dev 流動性トークンをバーン
   * @param to バーンしたトークンの送信先
   * @return amount0 トークン0の返却量
   * @return amount1 トークン1の返却量
   */
  function burn(
    address to
  ) external override lock nonReentrant returns (uint amount0, uint amount1) {
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves(); // ガス節約
    address _token0 = token0; // ガス節約
    address _token1 = token1; // ガス節約
    uint balance0 = IERC20(_token0).balanceOf(address(this));
    uint balance1 = IERC20(_token1).balanceOf(address(this));
    uint liquidity = balanceOf(address(this));

    bool feeOn = _mintFee(_reserve0, _reserve1);
    uint _totalSupply = totalSupply(); // ガス節約、_mintFeeの後に呼び出す必要がある

    amount0 = (liquidity * balance0) / _totalSupply; // 比例配分を使用
    amount1 = (liquidity * balance1) / _totalSupply; // 比例配分を使用

    require(amount0 > 0 && amount1 > 0, "AMMPair: INSUFFICIENT_LIQUIDITY_BURNED");
    _burn(address(this), liquidity);
    _safeTransfer(_token0, to, amount0);
    _safeTransfer(_token1, to, amount1);

    balance0 = IERC20(_token0).balanceOf(address(this));
    balance1 = IERC20(_token1).balanceOf(address(this));

    _update(balance0, balance1, _reserve0, _reserve1);
    if (feeOn) kLast = uint(reserve0) * reserve1; // reserve0とreserve1は最新
    emit Burn(msg.sender, amount0, amount1, to);
  }

  /**
   * @dev トークンスワップ
   * @param amount0Out トークン0の出力量
   * @param amount1Out トークン1の出力量
   * @param to 出力先アドレス
   * @param data フラッシュローン用データ
   */
  function swap(
    uint amount0Out,
    uint amount1Out,
    address to,
    bytes calldata data
  ) external override lock nonReentrant {
    require(amount0Out > 0 || amount1Out > 0, "AMMPair: INSUFFICIENT_OUTPUT_AMOUNT");
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves(); // ガス節約
    require(amount0Out < _reserve0 && amount1Out < _reserve1, "AMMPair: INSUFFICIENT_LIQUIDITY");

    uint balance0;
    uint balance1;
    {
      // スタック深度制限を回避するためのスコープ
      address _token0 = token0;
      address _token1 = token1;
      require(to != _token0 && to != _token1, "AMMPair: INVALID_TO");
      if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out); // 楽観的に転送
      if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out); // 楽観的に転送
      if (data.length > 0) IAMMCallee(to).ammCall(msg.sender, amount0Out, amount1Out, data);
      balance0 = IERC20(_token0).balanceOf(address(this));
      balance1 = IERC20(_token1).balanceOf(address(this));
    }

    uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
    uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
    require(amount0In > 0 || amount1In > 0, "AMMPair: INSUFFICIENT_INPUT_AMOUNT");

    {
      // スタック深度制限を回避するためのスコープ
      uint balance0Adjusted = balance0 * 1000 - amount0In * 3;
      uint balance1Adjusted = balance1 * 1000 - amount1In * 3;
      require(
        balance0Adjusted * balance1Adjusted >= uint(_reserve0) * uint(_reserve1) * 1000 ** 2,
        "AMMPair: K"
      );
    }

    _update(balance0, balance1, _reserve0, _reserve1);
    emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
  }

  /**
   * @dev 余剰トークンを強制的に残高に合わせる
   * @param to 余剰トークンの送信先
   */
  function skim(address to) external override lock {
    address _token0 = token0; // ガス節約
    address _token1 = token1; // ガス節約
    _safeTransfer(_token0, to, IERC20(_token0).balanceOf(address(this)) - reserve0);
    _safeTransfer(_token1, to, IERC20(_token1).balanceOf(address(this)) - reserve1);
  }

  /**
   * @dev 残高を現在のトークン残高に強制的に合わせる
   */
  function sync() external override lock {
    _update(
      IERC20(token0).balanceOf(address(this)),
      IERC20(token1).balanceOf(address(this)),
      reserve0,
      reserve1
    );
  }

  /**
   * @dev 手数料をミント（プロトコル手数料）
   * @param _reserve0 トークン0の残高
   * @param _reserve1 トークン1の残高
   * @return feeOn 手数料がオンかどうか
   */
  function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
    address feeTo = IAMMFactory(factory).feeTo();
    feeOn = feeTo != address(0);
    uint _kLast = kLast; // ガス節約
    if (feeOn) {
      if (_kLast != 0) {
        uint rootK = Math.sqrt(uint(_reserve0) * uint(_reserve1));
        uint rootKLast = Math.sqrt(_kLast);
        if (rootK > rootKLast) {
          uint numerator = totalSupply() * (rootK - rootKLast);
          uint denominator = rootK * 5 + rootKLast;
          uint liquidity = numerator / denominator;
          if (liquidity > 0) _mint(feeTo, liquidity);
        }
      }
    } else if (_kLast != 0) {
      kLast = 0;
    }
  }
}

// 価格計算用ライブラリ
library UQ112x112 {
  uint224 constant Q112 = 2 ** 112;

  // uint112をQ112.112固定小数点数にエンコード
  function encode(uint112 y) internal pure returns (uint224 z) {
    z = uint224(y) * Q112; // 決してオーバーフローしない
  }

  // Q112.112固定小数点数をuint112で割る
  function uqdiv(uint224 x, uint112 y) internal pure returns (uint224 z) {
    z = x / uint224(y);
  }
}

// フラッシュローン用インターフェース
interface IAMMCallee {
  function ammCall(address sender, uint amount0, uint amount1, bytes calldata data) external;
}
