# DEX技術仕様書

本ドキュメントは、実装されたDEX（分散取引所）の技術的な実装詳細と設計思想を説明します。

## アーキテクチャ概要

### Factory-Pair-Router パターン

本DEXは、Uniswap V2と同様のアーキテクチャを採用しています：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DexFactory    │    │    DexRouter    │    │     TokenA      │
│                 │    │                 │    │                 │
│ ペア作成・管理  │◄──►│ ユーザーIF      │◄──►│ ERC20+Faucet    │
│ 手数料設定      │    │ 流動性管理      │    │                 │
└─────────────────┘    │ スワップ処理    │    └─────────────────┘
         │              └─────────────────┘    ┌─────────────────┐
         ▼                        │            │     TokenB      │
┌─────────────────┐               │            │                 │
│    DexPair      │               └───────────►│ ERC20+Faucet    │
│                 │                            │                 │
│ AMM コア機能    │                            └─────────────────┘
│ 価格計算        │
│ 流動性プール    │
│ LPトークン管理  │
└─────────────────┘
```

## 主要コントラクト

### 1. DexFactory.sol

**役割**: ペアの作成と管理

**主要機能**:
- トークンペアの作成
- ペアアドレスの管理
- 手数料設定の管理

**重要な実装**:
```solidity
// ペア作成時のアドレス計算（CREATE2を使用）
bytes32 salt = keccak256(abi.encodePacked(token0, token1));
address pair = Clones.cloneDeterministic(pairImplementation, salt);
```

### 2. DexPair.sol

**役割**: AMM（自動マーケットメーカー）のコア機能

**主要機能**:
- 流動性プールの管理
- トークンスワップの処理
- LPトークンの発行・削除
- 価格オラクル機能

**重要な実装**:

#### 最小流動性（MINIMUM_LIQUIDITY）
```solidity
uint256 public constant MINIMUM_LIQUIDITY = 10**3;

// 初回流動性提供時
if (_totalSupply == 0) {
    liquidity = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
    _mint(address(0xdead), MINIMUM_LIQUIDITY); // 永続的にロック
}
```

**目的**: 
- 流動性の完全削除を防止
- 価格操作攻撃の防止
- プールの安定性確保

#### スワップ計算（x * y = k 公式）
```solidity
function swap(uint amount0Out, uint amount1Out, address to) external {
    // k = x * y の不変式を維持
    uint balance0Adjusted = balance0 * 1000 - amount0In * 3; // 0.3%手数料
    uint balance1Adjusted = balance1 * 1000 - amount1In * 3;
    require(balance0Adjusted * balance1Adjusted >= uint(_reserve0) * _reserve1 * (1000**2));
}
```

**手数料**: 0.3%（997/1000の比率で計算）

### 3. DexRouter.sol

**役割**: ユーザーインターフェースの提供

**主要機能**:
- 流動性の追加・削除
- トークンスワップの実行
- 価格計算ユーティリティ
- デッドライン保護

**重要な実装**:

#### 動的デッドライン計算
```solidity
modifier ensure(uint deadline) {
    require(deadline >= block.timestamp, 'DeadlineExpired');
    _;
}
```

#### スワップ計算（UniswapV2公式）
```solidity
function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) 
    internal pure returns (uint amountOut) {
    uint amountInWithFee = amountIn * 997; // 0.3%手数料を考慮
    uint numerator = amountInWithFee * reserveOut;
    uint denominator = (reserveIn * 1000) + amountInWithFee;
    amountOut = numerator / denominator;
}
```

### 4. TokenA/TokenB.sol

**役割**: テスト用ERC20トークン

**主要機能**:
- 標準ERC20機能
- フォーセット機能（24時間クールダウン）
- ReentrancyGuard保護

**重要な実装**:
```solidity
mapping(address => uint256) public lastFaucetTime;

function faucet() external nonReentrant {
    require(
        block.timestamp >= lastFaucetTime[msg.sender] + 86400,
        "Faucet: 24 hours not passed"
    );
    lastFaucetTime[msg.sender] = block.timestamp;
    _mint(msg.sender, 100 * 10**18); // 100トークンを配布
}
```

## 数学的基盤

### 1. 定数積公式（Constant Product Formula）

AMM の核となる公式：
```
x * y = k (定数)
```

- `x`: Token0のリザーブ量
- `y`: Token1のリザーブ量  
- `k`: 定数（流動性が追加される際に増加）

### 2. スワップ計算

入力量 `dx` に対する出力量 `dy` の計算：
```
dy = (y * dx * 997) / (x * 1000 + dx * 997)
```

- `997/1000`: 0.3%の手数料を差し引いた比率

### 3. 流動性計算

#### 初回流動性提供
```
LP = sqrt(x * y) - MINIMUM_LIQUIDITY
```

#### 追加流動性提供
```
LP = min(dx * totalSupply / x, dy * totalSupply / y)
```

## セキュリティ機能

### 1. ReentrancyGuard
- OpenZeppelinのReentrancyGuardを使用
- 再帰呼び出し攻撃を防止

### 2. デッドライン保護
- すべての取引に期限を設定
- フロントランニング攻撃の軽減

### 3. スリッページ保護
- 最小出力量の指定
- 価格変動による損失を制限

### 4. アドレス検証
- ゼロアドレスへの送金を防止
- 不正なアドレスでの操作を拒否

### 5. 整数オーバーフロー保護
- Solidity 0.8.x の自動チェック機能
- SafeMathライブラリの代替として機能

## ガス効率化

### 1. 最適化されたストレージレイアウト
```solidity
// パッキングを利用してガス効率を向上
uint112 private reserve0;  // 14バイト
uint112 private reserve1;  // 14バイト  
uint32 private blockTimestampLast;  // 4バイト
// 合計32バイト = 1つのストレージスロット
```

### 2. CREATE2を使用したペア作成
- 決定論的なアドレス生成
- ペアアドレスの事前計算が可能

### 3. 効率的な数学計算
- 平方根計算の最適化
- 除算の最小化

## テスト戦略

### 1. 単体テスト
- 各コントラクトの個別機能テスト
- エラーケースの検証
- 境界値テスト

### 2. 統合テスト
- エンドツーエンドのワークフローテスト
- 複数コントラクト間の相互作用
- 実用的なシナリオテスト

### 3. エッジケーステスト
- 最小流動性の処理
- 大量スワップの制限
- 同一比率での流動性追加

## 制限事項と考慮事項

### 1. フロントランニング
- ブロックチェーンの特性上、完全な防止は困難
- デッドライン機能で被害を軽減

### 2. 一時的損失（Impermanent Loss）
- 価格変動による流動性提供者の損失
- プロトコル設計上の固有の問題

### 3. スケーラビリティ
- Ethereum メインネットでの高い手数料
- レイヤー2ソリューションでの展開を推奨

### 4. 流動性の断片化
- 複数のペアでの流動性分散
- 効率的な価格発見の阻害

## 拡張可能性

### 1. マルチホップスワップ
- 現在実装済み（getAmountsOut/In）
- 複数ペアを経由したスワップが可能

### 2. 手数料構造の改善
- プロトコル手数料の導入
- ダイナミック手数料の実装

### 3. オラクル機能の強化
- TWAP（時間加重平均価格）の活用
- 外部価格フィードとの統合

### 4. ガバナンス機能
- DAO による意思決定
- パラメータの動的調整

## まとめ

本DEX実装は、Uniswap V2の設計思想を踏襲しつつ、以下の特徴を持ちます：

- **堅牢性**: 包括的なテストカバレッジ（53/53テスト通過）
- **セキュリティ**: 複数層のセキュリティ機能
- **効率性**: ガス効率を考慮した実装
- **拡張性**: 将来の機能追加に対応した設計

フロントエンド開発において、これらの技術仕様を理解することで、より効果的なユーザーインターフェースの構築が可能になります。
