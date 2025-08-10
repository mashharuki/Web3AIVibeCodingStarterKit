import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';

/**
 * NFTマーケットプレイスのデータを取得するためのカスタムフック
 */

/**
 * NFTの情報を表すインターフェース
 */
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

export interface NFTData {
  tokenId: string;
  owner: Address;
  creator: Address;
  tokenURI: string;
  metadata?: NFTMetadata;
  isListed: boolean;
  price?: string;
  listingId?: string;
}

/**
 * すべてのNFTデータを取得するフック
 * 現在はモックデータを返します
 */
export function useNFTs() {
  return useQuery({
    queryKey: ['nfts'],
    queryFn: async (): Promise<NFTData[]> => {
      // モックデータを返す（実装のプレースホルダー）
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockNFTs: NFTData[] = Array.from({ length: 12 }, (_, i) => {
        const colors = ['Blue', 'Red', 'Green', 'Purple', 'Orange', 'Yellow'];
        const styles = ['Abstract', 'Realistic', 'Cartoon', 'Minimalist', 'Surreal'];
        
        return {
          tokenId: (i + 1).toString(),
          owner: '0x1234567890123456789012345678901234567890' as Address,
          creator: '0x1234567890123456789012345678901234567890' as Address,
          tokenURI: `https://example.com/metadata/${i + 1}`,
          metadata: {
            name: `Creative NFT #${i + 1}`,
            description: `This is a creative NFT #${i + 1} with unique artistic elements and blockchain-verified authenticity.`,
            image: `https://picsum.photos/400/400?random=${i + 1}`,
            attributes: [
              { trait_type: 'Color', value: colors[i % colors.length] },
              { trait_type: 'Style', value: styles[i % styles.length] },
              { trait_type: 'Rarity', value: i < 3 ? 'Legendary' : i < 6 ? 'Rare' : 'Common' },
              { trait_type: 'Edition', value: `${i + 1}/100` },
            ],
          },
          isListed: i < 8, // 最初の8個を出品中とする
          price: i < 8 ? ((0.1 + Math.random() * 0.9) * 1e18).toString() : undefined,
          listingId: i < 8 ? (i + 1).toString() : undefined,
        };
      });

      return mockNFTs;
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    gcTime: 10 * 60 * 1000, // 10分間ガベージコレクション時間
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * 特定のNFTの詳細情報を取得するフック
 */
export function useNFT(tokenId: string) {
  return useQuery({
    queryKey: ['nft', tokenId],
    queryFn: async (): Promise<NFTData | null> => {
      if (!tokenId) {
        return null;
      }

      // モックデータを返す
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const id = Number.parseInt(tokenId, 10);
      return {
        tokenId,
        owner: '0x1234567890123456789012345678901234567890' as Address,
        creator: '0x0987654321098765432109876543210987654321' as Address,
        tokenURI: `https://example.com/metadata/${tokenId}`,
        metadata: {
          name: `Creative NFT #${tokenId}`,
          description: 'This NFT represents a unique digital artwork created with advanced generative algorithms. The piece showcases vibrant colors and intricate patterns that evolve based on blockchain data.',
          image: `https://picsum.photos/400/400?random=${tokenId}`,
          attributes: [
            { trait_type: 'Background', value: 'Blue' },
            { trait_type: 'Style', value: 'Abstract' },
            { trait_type: 'Rarity', value: 'Rare' },
            { trait_type: 'Edition', value: '1/1' },
          ],
        },
        isListed: id <= 8,
        price: id <= 8 ? (0.5 * 1e18).toString() : undefined,
        listingId: id <= 8 ? tokenId : undefined,
      };
    },
    enabled: !!tokenId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * ユーザーが所有するNFTを取得するフック
 */
export function useUserNFTs() {
  const { user, authenticated } = usePrivy();
  const { data: allNFTs = [] } = useNFTs();

  return useQuery({
    queryKey: ['userNFTs', user?.wallet?.address],
    queryFn: async (): Promise<NFTData[]> => {
      if (!authenticated || !user?.wallet?.address) {
        return [];
      }

      // モックデータ：ユーザーが最初の8個のNFTを所有していると仮定
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return allNFTs.slice(0, 8).map((nft: NFTData) => ({
        ...nft,
        owner: user.wallet?.address as Address,
      }));
    },
    enabled: authenticated && !!user?.wallet?.address && allNFTs.length > 0,
    staleTime: 2 * 60 * 1000, // 2分間キャッシュ
    gcTime: 5 * 60 * 1000,
  });
}
