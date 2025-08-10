'use client';

import { MainLayout } from '@/components/main-layout';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';

// NFT属性の型定義
interface NFTAttribute {
  id: string;
  trait_type: string;
  value: string;
}

// フォームデータの型定義
interface CreateNFTFormData {
  name: string;
  description: string;
  externalLink: string;
  attributes: NFTAttribute[];
  putOnMarketplace: boolean;
  price: string;
  duration: string;
}

/**
 * NFT作成ページコンポーネント
 * 新しいNFTを作成するためのフォームを提供します。
 */
export default function CreateNFTPage(): ReactNode {
  const { user } = usePrivy();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // フォーム状態管理
  const [formData, setFormData] = useState<CreateNFTFormData>({
    name: '',
    description: '',
    externalLink: '',
    attributes: [],
    putOnMarketplace: false,
    price: '',
    duration: '',
  });
  
  // ファイル状態管理
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // ウォレット未接続の場合の表示
  if (!user?.wallet?.address) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground">NFTを作成するにはウォレットに接続してください</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  /**
   * ファイル選択処理
   */
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  /**
   * ドラッグ&ドロップ処理
   */
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  /**
   * 属性追加処理
   */
  const addAttribute = () => {
    const newAttribute: NFTAttribute = {
      id: `attr-${Date.now()}-${Math.random()}`,
      trait_type: '',
      value: '',
    };
    setFormData(prev => ({
      ...prev,
      attributes: [...prev.attributes, newAttribute],
    }));
  };

  /**
   * 属性削除処理
   */
  const removeAttribute = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.filter(attr => attr.id !== id),
    }));
  };

  /**
   * 属性更新処理
   */
  const updateAttribute = (id: string, field: 'trait_type' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.map(attr => 
        attr.id === id ? { ...attr, [field]: value } : attr
      ),
    }));
  };

  /**
   * フォーム送信処理
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!selectedFile) {
      alert('画像ファイルを選択してください');
      return;
    }
    
    if (!formData.name.trim()) {
      alert('NFT名を入力してください');
      return;
    }

    setIsCreating(true);
    
    try {
      // TODO: ここで実際のNFT作成処理を実装
      // 1. IPFSに画像をアップロード
      // 2. メタデータを作成してIPFSにアップロード
      // 3. スマートコントラクトのmintNFT関数を呼び出し
      
      console.log('NFT作成データ:', {
        file: selectedFile,
        metadata: formData,
        creator: user?.wallet?.address,
      });
      
      // 暫定的な成功メッセージ
      alert('NFTが作成されました！（現在はモック実装）');
      
    } catch (error) {
      console.error('NFT作成エラー:', error);
      alert('NFTの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">NFTを作成</h1>
          <p className="text-muted-foreground">
            あなただけのデジタルアセットをブロックチェーン上で作成しましょう。
          </p>
        </div>

        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* 画像アップロード */}
          <div>
            <div className="block text-sm font-medium mb-3">
              画像・動画・音声ファイル*
            </div>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              tabIndex={0}
              role="button"
              aria-label="ファイルを選択"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,audio/*"
                aria-label="ファイルアップロード"
                onChange={handleFileSelect}
              />
              {previewUrl ? (
                <div className="space-y-4">
                  <div className="max-w-xs mx-auto">
                    <Image
                      src={previewUrl}
                      alt="プレビュー"
                      width={300}
                      height={300}
                      className="rounded-lg object-cover"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedFile?.name}
                  </div>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                  >
                    ファイルを変更
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl">📁</div>
                  <div className="text-lg font-medium">
                    ファイルをドラッグ&ドロップ
                  </div>
                  <div className="text-sm text-muted-foreground">
                    または クリックしてファイルを選択
                  </div>
                  <div className="text-xs text-muted-foreground">
                    JPG、PNG、GIF、SVG、MP4、WEBM、MP3、WAV、OGG (最大100MB)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* NFT名 */}
          <div>
            <label htmlFor="nft-name" className="block text-sm font-medium mb-2">
              NFT名*
            </label>
            <input
              type="text"
              id="nft-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="例: My Awesome NFT"
              required
            />
          </div>
          {/* 説明 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              説明
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="NFTの説明を入力してください..."
            />
          </div>

          {/* 外部リンク */}
          <div>
            <label htmlFor="external-link" className="block text-sm font-medium mb-2">
              外部リンク
            </label>
            <input
              type="url"
              id="external-link"
              value={formData.externalLink}
              onChange={(e) => setFormData(prev => ({ ...prev, externalLink: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://your-website.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              あなたのサイトやソーシャルメディアなどのリンクを追加できます。
            </p>
          </div>

          {/* 属性 */}
          <div>
            <div className="block text-sm font-medium mb-3">属性</div>
            <div className="space-y-3">
              {formData.attributes.map((attr) => (
                <div key={attr.id} className="flex gap-3">
                  <input
                    type="text"
                    value={attr.trait_type}
                    onChange={(e) => updateAttribute(attr.id, 'trait_type', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="属性名 (例: 色)"
                    aria-label="属性名"
                  />
                  <input
                    type="text"
                    value={attr.value}
                    onChange={(e) => updateAttribute(attr.id, 'value', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="値 (例: 青)"
                    aria-label="属性値"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttribute(attr.id)}
                    className="px-3 py-2 text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addAttribute}
              className="mt-3 px-4 py-2 text-primary border border-primary rounded-md hover:bg-primary/10"
            >
              + 属性を追加
            </button>
          </div>

          {/* 販売設定 */}
          <div className="border-t pt-8">
            <h3 className="text-lg font-semibold mb-4">販売設定</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="put-on-marketplace"
                  checked={formData.putOnMarketplace}
                  onChange={(e) => setFormData(prev => ({ ...prev, putOnMarketplace: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="put-on-marketplace" className="text-sm">
                  作成後すぐにマーケットプレイスに出品する
                </label>
              </div>

              {formData.putOnMarketplace && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium mb-2">
                      価格 (ETH)
                    </label>
                    <input
                      type="number"
                      id="price"
                      step="0.001"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0.1"
                    />
                  </div>
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium mb-2">
                      販売期間
                    </label>
                    <select
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">期間を選択</option>
                      <option value="7">7日間</option>
                      <option value="30">30日間</option>
                      <option value="90">90日間</option>
                      <option value="0">期間なし</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 作成ボタン */}
          <div className="border-t pt-8">
            <button
              type="submit"
              disabled={isCreating || !selectedFile || !formData.name.trim()}
              className="w-full bg-primary text-primary-foreground py-3 rounded-md hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'NFTを作成中...' : 'NFTを作成'}
            </button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              作成時にガス代が必要になる場合があります。
            </p>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
