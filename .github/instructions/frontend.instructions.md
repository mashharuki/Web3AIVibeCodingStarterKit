---
applyTo: './pkgs/frontend/**'
---

あなたは超優秀なフルスタックWeb3エンジニアです。

このワークスペースでフロントエンドアプリケーションを構築するためのルールを設定しました。

必ず以下のルールに従ってフロントエンドアプリケーションを開発してください。

# 使用する技術スタック(一般的なフロントエンドアプリケーション開発の技術スタック)

- TypeScript
- pnpm
- Next.js (App Router / `app/` ディレクトリ構成)
- PWA
- Tailwind CSS
- Shadcn / UI

# 使用する技術スタック(Web3に関連するもの)

- viem
- ethers
- privy
- Account Abstraction
- Biconomy

# shadcn / UIの設定ファイル

`components.json` は以下の設定を厳守してください：

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

# ディレクトリ構成ルール

以下の構成を必ず守ってください：

```bash
pkgs/frontend/
├── app/                # Next.jsのApp Routerディレクトリ
|    └── api/           # APIの実装を格納するディレクトリ
├── components/         # UIコンポーネントディレクトリ
├── hooks/              # カスタムフックディレクトリ
├── lib/                # ユーティリティ関数やその他のライブラリ用の関数群を格納するディレクトリ
├── styles/             # グローバルスタイルやテーマを格納するディレクトリ
├── public/             # 静的ファイル群を格納するディレクトリ
├── components.json     # shadcn / UIの設定ファイル
├── package.json        # パッケージ設定ファイル
├── tsconfig.json       # TypeScript設定ファイル
├── tailwind.config.js  # Tailwind CSS設定ファイル
├── postcss.config.js   # PostCSS設定ファイル
├── next.config.js      # Next.js設定ファイル
├── next-env.d.ts       # Next.jsの型定義ファイル
├── .env.local          # 環境変数設定ファイル
├── .env.example        # 環境変数のサンプルファイル
└── .gitignore          # Gitの無視設定ファイル
```

# 実装について

- lib/配下には共通的なユーティリティ関数（fetchラッパー、フォーマッター、定数定義など）を格納してください。
- hooks/配下には再利用可能なカスタムフックを設計単位で整理してください。  
  命名は`use`から始めること。  
  ただし以下のファイルは必ず実装するようにしてください。
  - `useBiconomy.ts`
- public/ には以下のような静的ファイルを配置します：
  - OG画像
  - サイトのファビコン
  - マニフェストファイル（PWA用）

# useBiconomy.tsの実装について

フロントエンドとスマートコントラウトのインテグレーションを行う上で最も重要になる `useBiconomy.ts` の実装については、以下のルールに従ってください。

- useBiconomy.tsで実装する機能
  - Biconomyのインスタンスを初期化する機能
  - ユーザーオペレーションを実行する機能

必ず以下のように実装してください。

```ts
import {
  type NexusClient,
  createBicoPaymasterClient,
  createSmartAccountClient,
  toNexusAccount,
} from "@biconomy/abstractjs";
import { useWallets } from "@privy-io/react-auth";
import { useCallback, useState } from "react";
import {
  type Abi,
  createWalletClient,
  custom,
  encodeFunctionData,
  http,
} from "viem";
// ここではbaseSepoliaを使用していますが、必要に応じて他のチェーンに変更してください。
import { baseSepolia } from "viem/chains";


// Biconomyアカウントの状態を管理する型
interface BiconomyAccountState {
  nexusAccount: NexusClient | null;
  address: string | null;
  isLoading: boolean;
  error: string | null;
}

// initializeBiconomyAccount の戻り値の型
interface InitializeAccountResult {
  nexusClient: NexusClient;
  address: string;
}

/**
 * Biconomyのスマートアカウント機能を管理するカスタムフック
 *
 * @returns Biconomyアカウントの状態と操作メソッド
 */
export const useBiconomy = () => {
  const { wallets } = useWallets();

  // エンベデッドウォレットの取得（エラーハンドリング改善）
  const embeddedWallet = wallets?.[0];

  // Biconomyアカウントの状態を管理する
  const [accountState, setAccountState] = useState<BiconomyAccountState>({
    nexusAccount: null,
    address: null,
    isLoading: false,
    error: null,
  });

  /**
   * Biconomyスマートアカウントを初期化する
   *
   * @returns 初期化されたnexusClientとアドレス
   */
  const initializeBiconomyAccount =
    useCallback(async (): Promise<InitializeAccountResult> => {
      try {
        setAccountState((prev) => ({ ...prev, isLoading: true, error: null }));

        if (!embeddedWallet) {
          throw new Error("Embedded wallet is not available");
        }

        const provider = await embeddedWallet.getEthereumProvider();
        // Create a signer Object for the embedded wallet
        const walletClient = createWalletClient({
          account: embeddedWallet.address as `0x${string}`,
          chain: baseSepolia,
          transport: custom(provider),
        });

        // Create Smart Account Client
        const nexusClient = createSmartAccountClient({
          account: await toNexusAccount({
            signer: walletClient,
            chain: baseSepolia,
            transport: http(),
          }),
          transport: http(
            `https://bundler.biconomy.io/api/v3/${baseSepolia.id}/${process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_API_KEY}`,
          ),
          paymaster: createBicoPaymasterClient({
            paymasterUrl: `https://paymaster.biconomy.io/api/v2/${baseSepolia.id}/${process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY}`,
          }),
        });
        // get the smart account address
        const address = await nexusClient.account.address;

        console.log("Nexus Account:", address);
        console.log("done initializing Biconomy account");

        setAccountState({
          nexusAccount: nexusClient,
          address: embeddedWallet.address,
          isLoading: false,
          error: null,
        });

        return { nexusClient, address };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setAccountState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error; // エラーを再スローして呼び出し元でキャッチできるようにする
      }
    }, [embeddedWallet]);


  /**
   * ユーザーオペレーションを実行するためのメソッド
   *
   * function call dataは、呼び出し元の方でviemのencodeFunctionDataを使用して作成してください。
   *
   * @param nexusClient NexusClientのインスタンス
   * @param contractAddress 実行したいコントラクトのアドレス
   * @param functionCallData 呼び出したいメソッドのfunction call data
   * @returns トランザクションハッシュ値
   */
  const executeUserOp = useCallback(
    async (
      nexusClient: NexusClient,
      contractAddress: `0x${string}`,
      functionCallData: string,
    ): Promise<string | null> => {
      try {
        // ユーザーオペレーションを実行するためのトランザクションを送信
        const hash = await nexusClient.sendTransaction({
          to: contractAddress,
          data: functionCallData,
          chain: baseSepolia,
        });

        console.log("Submitted tx hash:", hash);

        // トランザクションの確認を待つ
        const receipt = await nexusClient.waitForTransactionReceipt({ hash });
        console.log("Transaction receipt: ", receipt);

        return hash;
      } catch (error) {
        console.error("Error executing user operation:", error);
        throw error; // エラーを再スローして呼び出し元でキャッチできるようにする
      }
    },
    [embeddedWallet?.address],
  );

  return {
    // アカウント状態
    smartAccount: accountState.nexusAccount,
    address: accountState.address,
    isLoading: accountState.isLoading,
    error: accountState.error,
    // メソッド
    initializeBiconomyAccount,
    executeUserOp,
  };
}
```

# スマートコントラクトの読み込み系の処理の実装について

`viem`が提供している `readContract` を使用して、スマートコントラクトの読み込み系の処理を実装してください。

## 実装参考例

### Biconomy と Privyインテグレーション例

以下のGitHubリポジトリを参考にしてください。

GitHub mashharuki/serverless_zk_nft_app
https://github.com/mashharuki/serverless_zk_nft_app/tree/main/pkgs/frontend

### Next.js と Privyインテグレーション例

以下のリポジトリを参考にしてください。
https://github.com/privy-io/create-next-app

### Tailwind のカスタマイズガイドへのリンク

https://tailwindcss.com/docs/theme
https://ui.shadcn.com/docs/theming