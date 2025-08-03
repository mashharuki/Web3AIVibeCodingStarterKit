"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { NFT } from "@/lib/constants";
import { formatPrice } from "@/lib/web3";
import Image from "next/image";
import { useState } from "react";

interface NFTCardProps {
  nft: NFT;
  onBuy?: (nft: NFT) => void;
  onView?: (nft: NFT) => void;
  showBuyButton?: boolean;
}

export function NFTCard({ nft, onBuy, onView, showBuyButton = true }: NFTCardProps) {
  const [imageError, setImageError] = useState(false);

  const getImageSrc = () => {
    if (imageError || !nft.metadata?.image) {
      return "/placeholder-nft.png";
    }

    if (nft.metadata.image.startsWith("ipfs://")) {
      return `https://ipfs.io/ipfs/${nft.metadata.image.slice(7)}`;
    }

    return nft.metadata.image;
  };

  return (
    <Card className="nft-card group cursor-pointer transition-all duration-300 hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="relative aspect-square overflow-hidden rounded-t-lg">
          <Image
            src={getImageSrc()}
            alt={nft.metadata?.name || `NFT #${nft.tokenId}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => setImageError(true)}
          />
          {nft.isListed && (
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
              売出中
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <CardTitle className="text-lg mb-2 line-clamp-1">
          {nft.metadata?.name || `NFT #${nft.tokenId}`}
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 mb-3 line-clamp-2">
          {nft.metadata?.description || "No description available"}
        </CardDescription>

        {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">属性</p>
            <div className="flex flex-wrap gap-1">
              {nft.metadata.attributes.slice(0, 3).map((attr) => (
                <span
                  key={`${attr.trait_type}-${attr.value}`}
                  className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                >
                  {attr.trait_type}: {attr.value}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500">価格</p>
            <p className="font-bold text-lg text-nft-primary">
              {nft.price ? `${formatPrice(nft.price)} ETH` : "非売品"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">所有者</p>
            <p className="text-sm font-medium truncate">
              {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onView?.(nft)}>
          詳細を見る
        </Button>
        {showBuyButton && nft.isListed && nft.price && (
          <Button
            variant="default"
            size="sm"
            className="flex-1 bg-gradient-to-r from-nft-primary to-nft-secondary hover:opacity-90"
            onClick={() => onBuy?.(nft)}
          >
            購入する
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
