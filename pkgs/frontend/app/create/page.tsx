'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@/hooks/useWallet';
import { NFT_CONTRACT_ABI } from '@/lib/abi';
import { CONTRACT_ADDRESSES } from '@/lib/constants';
import Image from 'next/image';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { sepolia } from 'viem/chains';

interface NFTFormData {
  name: string;
  description: string;
  image: File | null;
  attributes: Array<{ trait_type: string; value: string }>;
}

export default function CreatePage() {
  const { authenticated, walletClient, address } = useWallet();
  const [formData, setFormData] = useState<NFTFormData>({
    name: '',
    description: '',
    image: null,
    attributes: [],
  });
  const [isCreating, setIsCreating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [newAttribute, setNewAttribute] = useState({ trait_type: '', value: '' });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const addAttribute = () => {
    if (newAttribute.trait_type && newAttribute.value) {
      setFormData(prev => ({
        ...prev,
        attributes: [...prev.attributes, { ...newAttribute }]
      }));
      setNewAttribute({ trait_type: '', value: '' });
    }
  };

  const removeAttribute = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index)
    }));
  };

  const uploadToIPFS = async (file: File): Promise<string> => {
    // 実際の実装では、Pinata、IPFS、またはその他のストレージサービスを使用
    // ここでは簡略化のためのモック実装
    toast.error('IPFS アップロード機能は実装中です');
    return 'ipfs://mock-hash';
  };

  const createMetadata = async (imageHash: string) => {
    const metadata = {
      name: formData.name,
      description: formData.description,
      image: imageHash,
      attributes: formData.attributes,
    };

    // メタデータもIPFSにアップロード
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const metadataFile = new File([metadataBlob], 'metadata.json');
    
    // 実際の実装ではIPFSにアップロード
    toast.error('メタデータアップロード機能は実装中です');
    return 'ipfs://mock-metadata-hash';
  };

  const mintNFT = async () => {
    if (!authenticated || !walletClient || !address) {
      toast.error('ウォレットを接続してください');
      return;
    }

    if (!formData.name || !formData.description || !formData.image) {
      toast.error('すべての必須フィールドを入力してください');
      return;
    }

    try {
      setIsCreating(true);

      // 1. 画像をIPFSにアップロード
      const imageHash = await uploadToIPFS(formData.image);
      
      // 2. メタデータを作成してIPFSにアップロード
      const tokenURI = await createMetadata(imageHash);

      // 3. NFTをミント
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.NFT_CONTRACT,
        abi: NFT_CONTRACT_ABI,
        functionName: 'mint',
        args: [
          address as `0x${string}`,
          tokenURI,
          address as `0x${string}`, // ロイヤリティ受取人
          250n, // 2.5% ロイヤリティ
        ],
        value: 10000000000000000n, // 0.01 ETH ミント手数料
        chain: sepolia, // Sepoliaチェーン
        account: address as `0x${string}`,
      });

      toast.success('NFTが正常に作成されました！');
      
      // フォームをリセット
      setFormData({
        name: '',
        description: '',
        image: null,
        attributes: [],
      });
      setPreviewUrl('');
      
    } catch (error) {
      console.error('NFT作成エラー:', error);
      toast.error('NFTの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>ウォレット接続が必要です</CardTitle>
            <CardDescription>
              NFTを作成するにはウォレットを接続してください
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">NFTを作成</h1>
            <p className="text-muted-foreground">
              あなたのデジタルアート作品をNFTとして世界に発信しましょう
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* フォーム */}
            <Card>
              <CardHeader>
                <CardTitle>NFT情報</CardTitle>
                <CardDescription>
                  NFTの詳細情報を入力してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 名前 */}
                <div>
                  <label htmlFor="nftName" className="block text-sm font-medium mb-2">
                    名前 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="nftName"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="NFTの名前を入力"
                  />
                </div>

                {/* 説明 */}
                <div>
                  <label htmlFor="nftDescription" className="block text-sm font-medium mb-2">
                    説明 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="nftDescription"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="NFTについて説明してください"
                  />
                </div>

                {/* 画像アップロード */}
                <div>
                  <label htmlFor="nftImage" className="block text-sm font-medium mb-2">
                    画像 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="nftImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* 属性 */}
                <div>
                  <div className="block text-sm font-medium mb-2">属性 (オプション)</div>
                  
                  {/* 既存の属性 */}
                  {formData.attributes.map((attr) => (
                    <div key={`${attr.trait_type}-${attr.value}`} className="flex items-center gap-2 mb-2">
                      <span className="bg-gray-100 px-3 py-1 rounded text-sm flex-1">
                        {attr.trait_type}: {attr.value}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAttribute(formData.attributes.indexOf(attr))}
                      >
                        削除
                      </Button>
                    </div>
                  ))}

                  {/* 新しい属性追加 */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAttribute.trait_type}
                      onChange={(e) => setNewAttribute(prev => ({ ...prev, trait_type: e.target.value }))}
                      placeholder="属性名"
                      className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-label="属性名"
                    />
                    <input
                      type="text"
                      value={newAttribute.value}
                      onChange={(e) => setNewAttribute(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="値"
                      className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-label="属性値"
                    />
                    <Button type="button" onClick={addAttribute} size="sm">
                      追加
                    </Button>
                  </div>
                </div>

                {/* 作成ボタン */}
                <Button
                  onClick={mintNFT}
                  disabled={isCreating}
                  className="w-full bg-gradient-to-r from-nft-primary to-nft-secondary hover:opacity-90"
                >
                  {isCreating ? 'NFT作成中...' : 'NFTを作成する (0.01 ETH)'}
                </Button>
              </CardContent>
            </Card>

            {/* プレビュー */}
            <Card>
              <CardHeader>
                <CardTitle>プレビュー</CardTitle>
                <CardDescription>
                  作成されるNFTのプレビューです
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 画像プレビュー */}
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    {previewUrl ? (
                      <Image
                        src={previewUrl}
                        alt="NFT Preview"
                        width={400}
                        height={400}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        画像を選択してください
                      </div>
                    )}
                  </div>

                  {/* メタデータプレビュー */}
                  <div>
                    <h3 className="font-semibold text-lg">{formData.name || 'NFT名'}</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      {formData.description || 'NFTの説明がここに表示されます'}
                    </p>
                    
                    {formData.attributes.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">属性</p>
                        <div className="flex flex-wrap gap-2">
                          {formData.attributes.map((attr) => (
                            <span
                              key={`preview-${attr.trait_type}-${attr.value}`}
                              className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                            >
                              {attr.trait_type}: {attr.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
