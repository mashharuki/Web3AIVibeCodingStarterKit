import { usePrivy } from '@privy-io/react-auth';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { encodeFunctionData, parseEther } from 'viem';

import { useBiconomy } from './useBiconomy';

// コントラクトのアBI（主要関数のみ）
const NFT_MARKETPLACE_ABI = [
  {
    type: 'function',
    name: 'listNFT',
    inputs: [
      { name: '_nftContract', type: 'address' },
      { name: '_tokenId', type: 'uint256' },
      { name: '_price', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'cancelListing',
    inputs: [{ name: '_listingId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'acceptOffer',
    inputs: [{ name: '_offerId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'buyNFT',
    inputs: [{ name: '_listingId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;

const NFT_CONTRACT_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setApprovalForAll',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// コントラクトアドレス（環境変数から取得）
const NFT_CONTRACT_ADDRESS = '0xEaC471E00787e7360E08C0b9a98BF0160302353e' as const;
const NFT_MARKETPLACE_ADDRESS = '0x9C6a56fBBef7EFD2b8dbC5F7DA8a261E00862d51' as const;

// トランザクション状態の型定義
interface TransactionState {
  isLoading: boolean;
  error: string | null;
}

/**
 * NFTマーケットプレイスのスマートコントラクト操作を提供するフック
 * フェーズ3.1: マイページからのアクション実装
 */
export const useNFTMarketplace = () => {
  const { user } = usePrivy();
  const { smartAccount, initializeBiconomyAccount, executeUserOp } = useBiconomy();
  const queryClient = useQueryClient();
  
  // トランザクション状態管理
  const [transactionState, setTransactionState] = useState<TransactionState>({
    isLoading: false,
    error: null,
  });

  /**
   * エラーハンドリングとキャッシュ無効化のヘルパー
   */
  const handleTransactionComplete = useCallback(() => {
    // NFTデータのキャッシュを無効化して最新データを取得
    queryClient.invalidateQueries({ queryKey: ['nfts'] });
    queryClient.invalidateQueries({ queryKey: ['userNFTs'] });
    setTransactionState({ isLoading: false, error: null });
  }, [queryClient]);

  const handleTransactionError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'トランザクションが失敗しました';
    setTransactionState({ isLoading: false, error: errorMessage });
    console.error('Transaction error:', error);
  }, []);

  /**
   * Biconomyアカウントを初期化し、準備が整ったクライアントを返す
   */
  const prepareClient = useCallback(async () => {
    if (!user?.wallet?.address) {
      throw new Error('ウォレットが接続されていません');
    }

    if (smartAccount) {
      return smartAccount;
    }

    const { nexusClient } = await initializeBiconomyAccount();
    return nexusClient;
  }, [user, smartAccount, initializeBiconomyAccount]);

  /**
   * NFTを出品する (listNFT)
   * @param tokenId NFTのトークンID
   * @param priceInEth 価格（ETH単位）
   */
  const listNFT = useCallback(async (tokenId: number, priceInEth: number) => {
    try {
      setTransactionState({ isLoading: true, error: null });
      
      const nexusClient = await prepareClient();
      const priceInWei = parseEther(priceInEth.toString());

      // まずNFTコントラクトに対してマーケットプレイスを承認
      const approveCallData = encodeFunctionData({
        abi: NFT_CONTRACT_ABI,
        functionName: 'setApprovalForAll',
        args: [NFT_MARKETPLACE_ADDRESS, true],
      });

      console.log('Approving marketplace...');
      await executeUserOp(nexusClient, NFT_CONTRACT_ADDRESS, approveCallData);

      // NFTを出品
      const listCallData = encodeFunctionData({
        abi: NFT_MARKETPLACE_ABI,
        functionName: 'listNFT',
        args: [NFT_CONTRACT_ADDRESS, BigInt(tokenId), priceInWei],
      });

      console.log('Listing NFT...');
      const txHash = await executeUserOp(nexusClient, NFT_MARKETPLACE_ADDRESS, listCallData);
      
      console.log('NFT listed successfully:', txHash);
      handleTransactionComplete();
      return txHash;
      
    } catch (error) {
      handleTransactionError(error);
      throw error;
    }
  }, [prepareClient, executeUserOp, handleTransactionComplete, handleTransactionError]);

  /**
   * 出品をキャンセルする (cancelListing)
   * @param listingId 出品ID
   */
  const cancelListing = useCallback(async (listingId: number) => {
    try {
      setTransactionState({ isLoading: true, error: null });
      
      const nexusClient = await prepareClient();

      const cancelCallData = encodeFunctionData({
        abi: NFT_MARKETPLACE_ABI,
        functionName: 'cancelListing',
        args: [BigInt(listingId)],
      });

      console.log('Cancelling listing...');
      const txHash = await executeUserOp(nexusClient, NFT_MARKETPLACE_ADDRESS, cancelCallData);
      
      console.log('Listing cancelled successfully:', txHash);
      handleTransactionComplete();
      return txHash;
      
    } catch (error) {
      handleTransactionError(error);
      throw error;
    }
  }, [prepareClient, executeUserOp, handleTransactionComplete, handleTransactionError]);

  /**
   * オファーを承諾する (acceptOffer)
   * @param offerId オファーID
   */
  const acceptOffer = useCallback(async (offerId: number) => {
    try {
      setTransactionState({ isLoading: true, error: null });
      
      const nexusClient = await prepareClient();

      // まずNFTコントラクトに対してマーケットプレイスを承認
      const approveCallData = encodeFunctionData({
        abi: NFT_CONTRACT_ABI,
        functionName: 'setApprovalForAll',
        args: [NFT_MARKETPLACE_ADDRESS, true],
      });

      console.log('Approving marketplace for offer acceptance...');
      await executeUserOp(nexusClient, NFT_CONTRACT_ADDRESS, approveCallData);

      const acceptCallData = encodeFunctionData({
        abi: NFT_MARKETPLACE_ABI,
        functionName: 'acceptOffer',
        args: [BigInt(offerId)],
      });

      console.log('Accepting offer...');
      const txHash = await executeUserOp(nexusClient, NFT_MARKETPLACE_ADDRESS, acceptCallData);
      
      console.log('Offer accepted successfully:', txHash);
      handleTransactionComplete();
      return txHash;
      
    } catch (error) {
      handleTransactionError(error);
      throw error;
    }
  }, [prepareClient, executeUserOp, handleTransactionComplete, handleTransactionError]);

  /**
   * NFTを購入する (buyNFT)
   * @param listingId 出品ID
   */
  const buyNFT = useCallback(async (listingId: number) => {
    try {
      setTransactionState({ isLoading: true, error: null });
      
      const nexusClient = await prepareClient();

      const buyCallData = encodeFunctionData({
        abi: NFT_MARKETPLACE_ABI,
        functionName: 'buyNFT',
        args: [BigInt(listingId)],
      });

      console.log('Buying NFT...');
      const txHash = await executeUserOp(nexusClient, NFT_MARKETPLACE_ADDRESS, buyCallData);
      
      console.log('NFT purchased successfully:', txHash);
      handleTransactionComplete();
      return txHash;
      
    } catch (error) {
      handleTransactionError(error);
      throw error;
    }
  }, [prepareClient, executeUserOp, handleTransactionComplete, handleTransactionError]);

  return {
    // 状態
    isLoading: transactionState.isLoading,
    error: transactionState.error,
    
    // アクション
    listNFT,
    cancelListing,
    acceptOffer,
    buyNFT,
    
    // コントラクトアドレス（デバッグ用）
    contractAddresses: {
      nftContract: NFT_CONTRACT_ADDRESS,
      marketplace: NFT_MARKETPLACE_ADDRESS,
    },
  };
};
