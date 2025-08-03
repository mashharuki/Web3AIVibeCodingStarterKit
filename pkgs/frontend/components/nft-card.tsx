import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

interface NFTCardProps {
  id: string;
  title: string;
  description: string;
  image: string;
  price: string;
  creator: string;
  isListed: boolean;
  onBuy?: () => void;
  onView?: () => void;
}

export function NFTCard({
  id,
  title,
  description,
  image,
  price,
  creator,
  isListed,
  onBuy,
  onView,
}: NFTCardProps) {
  return (
    <Card className="nft-card group cursor-pointer">
      <CardHeader className="p-0">
        <div className="relative aspect-square overflow-hidden rounded-t-lg">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {isListed && (
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
              売出中
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <CardTitle className="text-lg mb-2 line-clamp-1">{title}</CardTitle>
        <CardDescription className="text-sm text-gray-600 mb-3 line-clamp-2">
          {description}
        </CardDescription>
        
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500">価格</p>
            <p className="font-bold text-lg text-nft-primary">{price} ETH</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">作成者</p>
            <p className="text-sm font-medium truncate">{creator}</p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onView}
        >
          詳細を見る
        </Button>
        {isListed && (
          <Button
            variant="gradient"
            size="sm"
            className="flex-1"
            onClick={onBuy}
          >
            購入する
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
