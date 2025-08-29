# コードスタイルと規約

## 全般的な規約

### ファイル命名規約

- **ディレクトリとファイル**: kebab-case（例：`amm-factory.sol`）
- **Solidityコントラクト**: PascalCase（例：`AMMFactory.sol`）
- **Reactコンポーネント**: PascalCase（例：`TokenSwap.tsx`）
- **JavaScript/TypeScript**: camelCase（例：`calculatePrice.ts`）
- **ドキュメント**: snake_case（例：`project_overview.md`）
- **定数**: UPPER_SNAKE_CASE（例：`MINIMUM_LIQUIDITY`）

### コメント規約

- **コメント言語**: 日本語で記述
- **変数コメント**:
  ```typescript
  // 変数の概要を記述する
  const variableName: Type = value;
  ```
- **メソッドコメント**:
  ```typescript
  /**
   * メソッドの概要を記述する
   *
   * @param param1 パラメータ1の説明
   * @param param2 パラメータ2の説明
   * @returns 戻り値の説明
   */
  function methodName(param1: Type1, param2: Type2): ReturnType {
    // メソッドの処理内容を記述する
  }
  ```

## Solidity規約

### コントラクト構造

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '...';

/**
 * @title ContractName
 * @dev コントラクトの概要説明
 */
contract ContractName {
  // 定数
  uint public constant CONSTANT_NAME = 1000;

  // 状態変数
  address public owner;

  // イベント
  event EventName(address indexed user, uint amount);

  // モディファイア
  modifier onlyOwner() {
    require(msg.sender == owner, 'Not owner');
    _;
  }

  // コンストラクタ
  constructor() {}

  // 外部関数
  function externalFunction() external {}

  // パブリック関数
  function publicFunction() public {}

  // 内部関数
  function _internalFunction() internal {}

  // プライベート関数
  function _privateFunction() private {}
}
```

### Solidityスタイル

- **インデント**: 4スペース
- **行幅**: 120文字
- **関数の引数**: 型を明記
- **エラーメッセージ**: 英語で簡潔に
- **ガス最適化**: 冗長な実装を避け、効率的なパターンを使用

## TypeScript/JavaScript規約

### 基本スタイル

- **インデント**: 2スペース
- **行幅**: 80文字
- **セミコロン**: 必須
- **クォート**: シングルクォート使用
- **型注釈**: 必須（TypeScript）

### 関数定義

```typescript
// 関数の引数・戻り値には型を明記
function calculatePrice(amount: number, rate: number): number {
  return amount * rate;
}

// アロー関数の使用
const processData = (data: DataType[]): ProcessedData => {
  return data.map((item) => transformItem(item));
};
```

### 変数命名

```typescript
// メソッド名は動詞から始める
function getUserBalance(): number {}
function setTokenAmount(amount: number): void {}

// 数値を扱う変数名には単位がわかるような接尾辞をつける
const priceInWei: bigint = 1000000000000000000n;
const timeoutInMs: number = 5000;
const durationInSeconds: number = 300;
```

## React/Next.js規約

### コンポーネント構造

```typescript
import React from 'react';

interface ComponentProps {
  title: string;
  onAction: () => void;
}

export const ComponentName: React.FC<ComponentProps> = ({
  title,
  onAction
}) => {
  return (
    <div className="component-container">
      <h1>{title}</h1>
      <button onClick={onAction}>Action</button>
    </div>
  );
};
```

### ディレクトリ構造

```
src/
├── app/                 # Next.js App Router
├── components/          # 再利用可能コンポーネント
│   ├── ui/             # 基本UIコンポーネント
│   └── layout/         # レイアウトコンポーネント
├── hooks/              # カスタムフック
├── lib/                # ユーティリティとライブラリ
├── types/              # TypeScript型定義
└── styles/             # スタイルファイル
```

## Prettier設定

### 全体設定

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### Solidity専用設定

```json
{
  "files": "*.sol",
  "options": {
    "printWidth": 120,
    "tabWidth": 4,
    "useTabs": false,
    "singleQuote": false,
    "bracketSpacing": false
  }
}
```

## 品質基準

### コード品質

- **テストカバレッジ**: 80%以上
- **複雑度**: 関数あたり10以下
- **重複コード**: 3%以下
- **ESLintエラー**: 0件
- **TypeScriptエラー**: 0件

### DRY原則

- 同じロジックの重複を避ける
- 関数として切り出して再利用する
- 設定値は定数として定義する
