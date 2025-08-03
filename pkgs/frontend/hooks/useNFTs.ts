"use client";

import { MARKETPLACE_CONTRACT_ABI, NFT_CONTRACT_ABI } from "@/lib/abi";
import type { NFT, NFTMetadata } from "@/lib/constants";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { publicClient } from "@/lib/web3";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { encodeFunctionData } from "viem";
import { useBiconomy } from "./useBiconomy";
import { useDirectWallet } from "./useDirectWallet";
import { useWallet } from "./useWallet";

export function useNFTs() {
  const { authenticated, address } = useWallet();
  const { smartAccount, initializeBiconomyAccount, executeUserOp } = useBiconomy();
  const { executeTransaction, isLoading: directWalletLoading } = useDirectWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [useAccountAbstraction, setUseAccountAbstraction] = useState(false); // AA使用フラグ

  /**
   * NFTメタデータを取得する
   */
  const fetchMetadata = useCallback(async (tokenURI: string): Promise<NFTMetadata | null> => {
    try {
      // IPFSのURLを変換
      const url = tokenURI.startsWith("ipfs://")
        ? `https://ipfs.io/ipfs/${tokenURI.slice(7)}`
        : tokenURI;

      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error("メタデータ取得エラー:", error);
      return null;
    }
  }, []);

  /**
   * マーケットプレイスの出品情報を取得する
   */
  const getActiveListings = useCallback(async () => {
    try {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT,
        abi: MARKETPLACE_CONTRACT_ABI,
        functionName: "getActiveListings",
      });
      return result;
    } catch (error) {
      console.error("出品情報取得エラー:", error);
      return [[], []];
    }
  }, []);

  /**
   * 全ての出品中NFTを取得する
   */
  const fetchListedNFTs = useCallback(async (): Promise<NFT[]> => {
    try {
      const [listings, listingIds] = await getActiveListings();
      const nftPromises = (listings as unknown[]).map(async (listing: unknown, index: number) => {
        try {
          const listingData = listing as {
            tokenId: bigint;
            nftContract: string;
            seller: string;
            active: boolean;
            price: bigint;
          };

          // NFTのメタデータを取得
          const tokenURI = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.NFT_CONTRACT,
            abi: NFT_CONTRACT_ABI,
            functionName: "tokenURI",
            args: [listingData.tokenId],
          });

          const metadata = await fetchMetadata(tokenURI as string);

          const nft: NFT = {
            tokenId: listingData.tokenId.toString(),
            contractAddress: listingData.nftContract,
            owner: listingData.seller,
            creator: listingData.seller, // 作成者情報が必要な場合は別途取得
            tokenURI: tokenURI as string,
            metadata: metadata || undefined,
            isListed: listingData.active,
            price: (Number(listingData.price) / 1e18).toString(),
            listingId: String((listingIds as unknown[])[index]),
          };

          return nft;
        } catch (error) {
          console.error("NFT情報取得エラー:", error);
          return null;
        }
      });

      const results = await Promise.all(nftPromises);
      return results.filter((nft): nft is NFT => nft !== null);
    } catch (error) {
      console.error("出品NFT取得エラー:", error);
      return [];
    }
  }, [getActiveListings, fetchMetadata]);

  /**
   * 特定ユーザーのNFTを取得する
   */
  const fetchUserNFTs = async (userAddress: string): Promise<NFT[]> => {
    try {
      // ユーザーの保有NFT数を取得
      const balance = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.NFT_CONTRACT,
        abi: NFT_CONTRACT_ABI,
        functionName: "balanceOf",
        args: [userAddress as `0x${string}`],
      });

      // 各NFTの情報を取得（実装を簡略化）
      // 実際の実装では、イベントログやインデックスサービスを使用する
      console.log(`ユーザー ${userAddress} は ${balance} 個のNFTを保有しています`);

      return [];
    } catch (error) {
      console.error("ユーザーNFT取得エラー:", error);
      return [];
    }
  };

  /**
   * NFTを購入する
   */
  const buyNFT = async (listingId: string, price: string) => {
    if (!authenticated || !address) {
      toast.error("ウォレットが接続されていません");
      return false;
    }

    try {
      setLoading(true);

      // 関数呼び出しデータをエンコード
      const functionCallData = encodeFunctionData({
        abi: MARKETPLACE_CONTRACT_ABI,
        functionName: "buyNFT",
        args: [BigInt(listingId)],
      });

      let txHash: string;

      if (useAccountAbstraction) {
        // Account Abstraction使用
        let nexusClient = smartAccount;
        if (!nexusClient) {
          console.log("Biconomyアカウントを初期化中...");
          const result = await initializeBiconomyAccount();
          nexusClient = result.nexusClient;
        }

        // ガスレストランザクションを実行
        console.log("Biconomyでガスレス購入を実行中...");
        const hash = await executeUserOp(
          nexusClient,
          CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT,
          functionCallData
        );
        
        if (!hash) {
          throw new Error("トランザクションの実行に失敗しました");
        }
        
        txHash = hash;
      } else {
        // 直接ウォレット接続使用
        console.log("直接ウォレットで購入を実行中...");
        txHash = await executeTransaction(
          CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT,
          functionCallData
        );
      }

      toast.success(`NFTを購入しました！ tx: ${txHash.slice(0, 10)}...`);
      
      // NFTリストを更新
      await fetchNFTs();
      
      return true;
    } catch (error) {
      console.error("NFT購入エラー:", error);
      const errorMessage = error instanceof Error ? error.message : "購入に失敗しました";
      toast.error(`購入エラー: ${errorMessage}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * NFTを出品する
   */
  const listNFT = async (tokenId: string, price: string) => {
    if (!authenticated || !address) {
      toast.error("ウォレットが接続されていません");
      return false;
    }

    try {
      setLoading(true);

      // 価格をweiに変換
      const priceInWei = BigInt(Math.floor(parseFloat(price) * 1e18));

      // 関数呼び出しデータをエンコード
      const functionCallData = encodeFunctionData({
        abi: MARKETPLACE_CONTRACT_ABI,
        functionName: "listNFT",
        args: [
          CONTRACT_ADDRESSES.NFT_CONTRACT,
          BigInt(tokenId),
          priceInWei,
        ],
      });

      let txHash: string;

      if (useAccountAbstraction) {
        // Account Abstraction使用
        let nexusClient = smartAccount;
        if (!nexusClient) {
          const result = await initializeBiconomyAccount();
          nexusClient = result.nexusClient;
        }

        // ガスレストランザクションを実行
        const hash = await executeUserOp(
          nexusClient,
          CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT,
          functionCallData
        );
        
        if (!hash) {
          throw new Error("トランザクションの実行に失敗しました");
        }
        
        txHash = hash;
      } else {
        // 直接ウォレット接続使用
        txHash = await executeTransaction(
          CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT,
          functionCallData
        );
      }

      toast.success(`NFTを出品しました！ tx: ${txHash.slice(0, 10)}...`);
      return true;
    } catch (error) {
      console.error("NFT出品エラー:", error);
      const errorMessage = error instanceof Error ? error.message : "出品に失敗しました";
      toast.error(`出品エラー: ${errorMessage}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * NFTリストを取得・更新する
   */
  const fetchNFTs = useCallback(async () => {
    try {
      setLoading(true);
      const listedNFTs = await fetchListedNFTs();
      setNfts(listedNFTs);
    } catch (error) {
      console.error("NFT取得エラー:", error);
      toast.error("NFTの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [fetchListedNFTs]);

  // 初期化時にNFTを取得
  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return {
    nfts,
    loading: loading || directWalletLoading,
    fetchNFTs,
    buyNFT,
    listNFT,
    fetchUserNFTs,
    useAccountAbstraction,
    setUseAccountAbstraction,
  };
}
      }

      // function call dataを作成
      const functionCallData = encodeFunctionData({
        abi: MARKETPLACE_CONTRACT_ABI,
        functionName: "buyNFT",
        args: [BigInt(listingId)],
      });

      // ユーザーオペレーションを実行
      const hash = await executeUserOp(
        nexusClient,
        CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT,
        functionCallData as `0x${string}`
      );

      if (hash) {
        toast.success("NFTの購入が完了しました！");
        return true;
      }
      return false;
    } catch (error) {
      console.error("NFT購入エラー:", error);
      toast.error("NFTの購入に失敗しました");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * NFTを出品する
   */
  const listNFT = async (tokenId: string, price: string) => {
    if (!authenticated || !address) {
      toast.error("ウォレットが接続されていません");
      return false;
    }

    try {
      setLoading(true);

      // Biconomyアカウントを初期化（まだの場合）
      let nexusClient = smartAccount;
      if (!nexusClient) {
        const result = await initializeBiconomyAccount();
        nexusClient = result.nexusClient;
      }

      // まずマーケットプレイスにNFTの承認を与える
      const approveCallData = encodeFunctionData({
        abi: NFT_CONTRACT_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT, BigInt(tokenId)],
      });

      await executeUserOp(
        nexusClient,
        CONTRACT_ADDRESSES.NFT_CONTRACT,
        approveCallData as `0x${string}`
      );

      // NFTを出品する
      const listCallData = encodeFunctionData({
        abi: MARKETPLACE_CONTRACT_ABI,
        functionName: "listNFT",
        args: [
          CONTRACT_ADDRESSES.NFT_CONTRACT,
          BigInt(tokenId),
          BigInt(Math.floor(Number.parseFloat(price) * 1e18)),
        ],
      });

      const hash = await executeUserOp(
        nexusClient,
        CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT,
        listCallData as `0x${string}`
      );

      if (hash) {
        toast.success("NFTが出品されました！");
        return true;
      }
      return false;
    } catch (error) {
      console.error("NFT出品エラー:", error);
      toast.error("NFTの出品に失敗しました");
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadNFTs = async () => {
      setLoading(true);
      const listedNFTs = await fetchListedNFTs();
      setNfts(listedNFTs);
      setLoading(false);
    };

    loadNFTs();
  }, [fetchListedNFTs]);

  return {
    nfts,
    loading,
    fetchListedNFTs,
    fetchUserNFTs,
    buyNFT,
    listNFT,
    fetchMetadata,
  };
}
