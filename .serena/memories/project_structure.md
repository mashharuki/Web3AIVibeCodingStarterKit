# プロジェクト構造

## ルートディレクトリ
```
.
├── pkgs/                   # パッケージディレクトリ（モノレポ）
├── docs/                   # ドキュメント
├── .github/                # GitHub設定・CI・instructions
├── .vscode/                # VSCode設定（MCP設定含む）
├── .serena/                # Serena MCP設定
├── package.json            # ルートパッケージ設定
├── pnpm-workspace.yaml     # pnpm workspaces設定
├── biome.json              # Biome設定
├── README.md
├── LICENSE
└── .gitignore
```

## パッケージ構成
- `pkgs/contract/`: スマートコントラクトパッケージ
- `pkgs/frontend/`: Next.js フロントエンドパッケージ

### contract/ ディレクトリ構造
```
pkgs/contract/
├── contracts/              # Solidityファイル
│   ├── NFTContract.sol     # ERC-721 NFTコントラクト
│   └── NFTMarketplace.sol  # マーケットプレイスコントラクト
├── test/                   # テストファイル (*.test.ts)
├── ignition/               # デプロイメントスクリプト
├── tasks/                  # Hardhatタスク
├── helpers/                # ユーティリティ関数
├── outputs/                # デプロイメント出力
├── artifacts/              # コンパイル済みコントラクト
├── typechain-types/        # TypeScript型定義
├── hardhat.config.ts       # Hardhat設定
├── package.json
└── tsconfig.json
```

### frontend/ ディレクトリ構造
```
pkgs/frontend/
├── app/                    # Next.js App Router
│   ├── globals.css         # グローバルスタイル
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # ホームページ
│   ├── create/             # NFT作成ページ
│   │   └── page.tsx
│   ├── nfts/              # NFT一覧・マーケットプレイス
│   │   └── page.tsx
│   └── profile/           # ユーザープロフィール
│       └── page.tsx
├── components/            # Reactコンポーネント
│   ├── ui/               # shadcn/ui コンポーネント
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── tabs.tsx
│   ├── header.tsx        # ヘッダーコンポーネント
│   ├── wallet-button.tsx # ウォレット接続ボタン
│   ├── nft-card.tsx      # NFTカードコンポーネント
│   ├── nft-card-improved.tsx
│   └── providers.tsx     # プロバイダー設定
├── hooks/                # カスタムフック
│   ├── useWallet.ts      # ウォレット関連フック
│   └── useNFTs.ts        # NFT操作フック
├── lib/                  # ユーティリティライブラリ
│   ├── abi.ts           # スマートコントラクトABI
│   ├── constants.ts     # 定数・型定義
│   ├── web3.ts          # Web3設定・ユーティリティ
│   └── utils.ts         # 汎用ユーティリティ
├── next.config.js       # Next.js設定
├── tailwind.config.js   # Tailwind CSS設定
├── postcss.config.js    # PostCSS設定
├── components.json      # shadcn/ui設定
├── tsconfig.json        # TypeScript設定
├── package.json
├── .env.example         # 環境変数テンプレート
└── README.md
```

## 主要ファイル
- **NFTContract.sol**: ERC-721準拠、ロイヤリティ対応NFTコントラクト
- **NFTMarketplace.sol**: 固定価格販売・オファー機能を持つマーケットプレイス
- **hardhat.config.ts**: Hardhat設定（ネットワーク、コンパイラ等）
- **biome.json**: リンター・フォーマッター設定

### フロントエンド主要ファイル
- **app/layout.tsx**: ルートレイアウト、Privy・Theme プロバイダー設定
- **app/page.tsx**: ホームページ・ランディングページ
- **app/create/page.tsx**: NFT作成フォーム（画像アップロード、メタデータ入力、ミント機能）
- **app/nfts/page.tsx**: NFTマーケットプレイス（一覧、検索、フィルター、購入機能）
- **app/profile/page.tsx**: ユーザープロフィール（所有NFT、統計、出品管理）
- **components/providers.tsx**: Privy認証・Theme・Toast プロバイダー統合
- **hooks/useWallet.ts**: Privy ウォレット統合フック
- **hooks/useNFTs.ts**: NFT操作（一覧取得、購入、出品）フック
- **lib/web3.ts**: Viem クライアント設定・Web3ユーティリティ
- **lib/constants.ts**: コントラクトアドレス・型定義・設定値
- **lib/abi.ts**: スマートコントラクトABI定義
- **tailwind.config.js**: カスタムカラー・アニメーション・テーマ設定