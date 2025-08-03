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
  const initializeBiconomyAccount = useCallback(async (): Promise<InitializeAccountResult> => {
    try {
      setAccountState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (!embeddedWallet) {
        throw new Error("Embedded wallet is not available");
      }

      const provider = await embeddedWallet.getEthereumProvider();
      // Create a signer Object for the embedded wallet
      const walletClient = createWalletClient({
        account: embeddedWallet.address as `0x${string}`,
        chain: sepolia,
        transport: custom(provider),
      });

      // Create Smart Account Client
      const nexusClient = createSmartAccountClient({
        account: await toNexusAccount({
          signer: walletClient,
          chain: sepolia,
          transport: http(),
        }),
        transport: http(
          `https://bundler.biconomy.io/api/v3/${sepolia.id}/${process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_API_KEY}`
        ),
        paymaster: createBicoPaymasterClient({
          paymasterUrl: `https://paymaster.biconomy.io/api/v2/${sepolia.id}/${process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY}`,
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
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
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
        // ユーザーオペレーションを実行するためのトランザクションを送信
        const hash = await nexusClient.sendTransaction({
          to: contractAddress,
          data: functionCallData,
          chain: sepolia,
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
