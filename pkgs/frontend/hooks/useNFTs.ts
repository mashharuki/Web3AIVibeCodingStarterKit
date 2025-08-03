"use client";

import { MARKETPLACE_CONTRACT_ABI, NFT_CONTRACT_ABI } from "@/lib/abi";
import type { NFT, NFTMetadata } from "@/lib/constants";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { publicClient } from "@/lib/web3";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { encodeFunctionData } from "viem";
import { useBiconomy } from "./useBiconomy";
import { useWallet } from "./useWallet";

export function useNFTs() {
  const { authenticated, address } = useWallet();
  const { smartAccount, initializeBiconomyAccount, executeUserOp } = useBiconomy();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);

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

      // Biconomyアカウントを初期化（まだの場合）
      let nexusClient = smartAccount;
      if (!nexusClient) {
        const result = await initializeBiconomyAccount();
        nexusClient = result.nexusClient;
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
