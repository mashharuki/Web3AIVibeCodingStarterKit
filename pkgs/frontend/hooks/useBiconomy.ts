import {
  type NexusClient,
  createBicoPaymasterClient,
  createSmartAccountClient,
  toNexusAccount,
} from "@biconomy/abstractjs";
import { useWallets } from "@privy-io/react-auth";
import { useCallback, useState } from "react";
import { createWalletClient, custom, http } from "viem";
// ここではsepoliaを使用していますが、必要に応じて他のチェーンに変更してください。
import { sepolia } from "viem/chains";

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

  // エンベデッドウォレットの取得（Privyの埋め込みウォレット）
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');

  // Biconomyアカウントの状態を管理する
  const [accountState, setAccountState] = useState<BiconomyAccountState>({
    nexusAccount: null,
    address: null,
    isLoading: false,
    error: null,
  });

  /**
   * Biconomyアカウントを初期化する
   *
   * @returns 初期化されたNexusClientとアドレス
   * @throws エラーが発生した場合
   */
  const initializeBiconomyAccount = useCallback(async (): Promise<InitializeAccountResult> => {
    if (!embeddedWallet) {
      throw new Error("Privyの埋め込みウォレットが見つかりません");
    }

    setAccountState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log("Biconomyアカウントの初期化を開始しています...");
      console.log("使用するウォレット:", embeddedWallet);
      console.log("環境変数チェック:");
      console.log("- Bundler API Key:", process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_API_KEY ? "設定済み" : "未設定");
      console.log("- Paymaster API Key:", process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY ? "設定済み" : "未設定");

      // プロバイダーの取得を確認
      let provider: unknown;
      try {
        provider = await embeddedWallet.getEthereumProvider();
        console.log("Ethereum プロバイダーを取得しました:", !!provider);
      } catch (providerError) {
        console.error("プロバイダー取得エラー:", providerError);
        throw new Error("Ethereum プロバイダーの取得に失敗しました");
      }

      // EOAウォレットクライアントの作成
      const eoaWalletClient = createWalletClient({
        account: embeddedWallet.address as `0x${string}`,
        chain: sepolia,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom(provider as any),
      });

      console.log("EOAウォレットクライアントを作成しました:", eoaWalletClient.account?.address);

      // Nexusアカウントの作成
      const nexusAccount = await toNexusAccount({
        signer: eoaWalletClient,
        chain: sepolia,
        transport: http(),
      });

      console.log("Nexusアカウントを作成しました:", nexusAccount.address);

      // API キーの確認
      const bundlerApiKey = process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_API_KEY;
      const paymasterApiKey = process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY;

      if (!bundlerApiKey || !paymasterApiKey) {
        throw new Error("Biconomy API キーが設定されていません");
      }

      console.log("API キーを確認しました");

      // より安定したBiconomy設定を使用
      // Bundler URLとPaymaster URLを分けて管理
      const bundlerUrl = `https://bundler.biconomy.io/api/v3/${sepolia.id}/${bundlerApiKey}`;
      const paymasterUrl = `https://paymaster.biconomy.io/api/v2/${sepolia.id}/${paymasterApiKey}`;

      console.log("Bundler URL:", bundlerUrl.replace(bundlerApiKey, "***"));
      console.log("Paymaster URL:", paymasterUrl.replace(paymasterApiKey, "***"));

      // Biconomy Paymasterクライアントの作成（シンプルな設定）
      const paymasterClient = createBicoPaymasterClient({
        transport: http(paymasterUrl),
      });

      console.log("Paymasterクライアントを作成しました");

      // スマートアカウントクライアントの作成（タイムアウト設定追加）
      const nexusClient = createSmartAccountClient({
        account: nexusAccount,
        chain: sepolia,
        transport: http(bundlerUrl, {
          timeout: 30000, // 30秒のタイムアウト
        }),
        paymaster: paymasterClient,
      });

      console.log("スマートアカウントクライアントを作成しました:", nexusClient.account.address);

      // 状態を更新
      setAccountState({
        nexusAccount: nexusClient,
        address: nexusClient.account.address,
        isLoading: false,
        error: null,
      });

      return {
        nexusClient: nexusClient,
        address: nexusClient.account.address,
      };
    } catch (error) {
      console.error("Biconomyアカウントの初期化に失敗しました:", error);
      const errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました";
      setAccountState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [embeddedWallet]);  /**
   * ユーザーオペレーションを実行するためのメソッド
   *
   * function call dataは、呼び出し元の方でviemのencodeFunctionDataを使用して作成してください。
   *
   * @param nexusClient NexusClientのインスタンス
   * @param contractAddress 実行したいコントラクトのアドレス
   * @param functionCallData 呼び出したいメソッドのfunction call data (0x形式)
   * @returns トランザクションハッシュ値
   */
  const executeUserOp = useCallback(
    async (
      nexusClient: NexusClient,
      contractAddress: `0x${string}`,
      functionCallData: `0x${string}`
    ): Promise<string | null> => {
      try {
        console.log("ユーザーオペレーション実行開始:");
        console.log("- Contract Address:", contractAddress);
        console.log("- Function Call Data:", functionCallData);
        
        // リトライ機能付きでユーザーオペレーションを実行
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            console.log(`実行試行 ${retryCount + 1}/${maxRetries}`);
            
            // ユーザーオペレーションを実行するためのトランザクションを送信
            const hash = await nexusClient.sendTransaction({
              to: contractAddress,
              data: functionCallData,
              chain: sepolia,
            });

            console.log("Submitted tx hash:", hash);

            // トランザクションの確認を待つ（タイムアウト設定）
            const receipt = await nexusClient.waitForTransactionReceipt({ 
              hash,
              timeout: 60000, // 60秒のタイムアウト
            });
            console.log("Transaction receipt: ", receipt);

            return hash;
          } catch (error: unknown) {
            retryCount++;
            console.error(`試行 ${retryCount} でエラー:`, error);
            
            // 429エラーの場合は少し待ってリトライ
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("429") || errorMessage.includes("Too Many Requests")) {
              console.log("レート制限に達しました。3秒待機してリトライします...");
              await new Promise(resolve => setTimeout(resolve, 3000));
              continue;
            }
            
            // その他のエラーの場合はすぐに再スロー
            if (retryCount >= maxRetries) {
              throw error;
            }
            
            // 1秒待ってリトライ
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        throw new Error("最大リトライ回数に達しました");
      } catch (error) {
        console.error("Error executing user operation:", error);
        throw error; // エラーを再スローして呼び出し元でキャッチできるようにする
      }
    },
    []
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
};
