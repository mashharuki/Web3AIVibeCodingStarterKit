"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBiconomy } from "@/hooks/useBiconomy";
import { useWallet } from "@/hooks/useWallet";
import { NFT_CONTRACT_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";
import { encodeFunctionData } from "viem";

interface NFTFormData {
  name: string;
  description: string;
  image: File | null;
  attributes: Array<{ trait_type: string; value: string }>;
}

export default function CreatePage() {
  const { authenticated, address } = useWallet();
  const { smartAccount, initializeBiconomyAccount, executeUserOp } = useBiconomy();
  const [formData, setFormData] = useState<NFTFormData>({
    name: "",
    description: "",
    image: null,
    attributes: [],
  });
  const [isCreating, setIsCreating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [newAttribute, setNewAttribute] = useState({ trait_type: "", value: "" });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const addAttribute = () => {
    if (newAttribute.trait_type && newAttribute.value) {
      setFormData((prev) => ({
        ...prev,
        attributes: [...prev.attributes, { ...newAttribute }],
      }));
      setNewAttribute({ trait_type: "", value: "" });
    }
  };

  const removeAttribute = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index),
    }));
  };

  const uploadToIPFS = async (file: File): Promise<string> => {
    // 実際の実装では、Pinata、IPFS、またはその他のストレージサービスを使用
    // ここでは簡略化のためのモック実装
    toast.error("IPFS アップロード機能は実装中です");
    return "ipfs://mock-hash";
  };

  const createMetadata = async (imageHash: string) => {
    const metadata = {
      name: formData.name,
      description: formData.description,
      image: imageHash,
      attributes: formData.attributes,
    };

    // メタデータもIPFSにアップロード
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
    const metadataFile = new File([metadataBlob], "metadata.json");

    // 実際の実装ではIPFSにアップロード
    toast.error("メタデータアップロード機能は実装中です");
    return "ipfs://mock-metadata-hash";
  };

  const mintNFT = async () => {
    if (!authenticated || !address) {
      toast.error("ウォレットを接続してください");
      return;
    }

    if (!formData.name || !formData.description || !formData.image) {
      toast.error("すべての必須フィールドを入力してください");
      return;
    }

    try {
      setIsCreating(true);

      // Biconomyアカウントを初期化（まだの場合）
      let nexusClient = smartAccount;
      if (!nexusClient) {
        const result = await initializeBiconomyAccount();
        nexusClient = result.nexusClient;
      }

      // 1. 画像をIPFSにアップロード
      const imageHash = await uploadToIPFS(formData.image);

      // 2. メタデータを作成してIPFSにアップロード
      const tokenURI = await createMetadata(imageHash);

      // 3. NFTミントのfunction call dataを作成
      const mintCallData = encodeFunctionData({
        abi: NFT_CONTRACT_ABI,
        functionName: "mint",
        args: [
          address as `0x${string}`,
          tokenURI,
          address as `0x${string}`, // ロイヤリティ受取人
          250n, // 2.5% ロイヤリティ
        ],
      });

      // 4. ユーザーオペレーションを実行
      const hash = await executeUserOp(
        nexusClient,
        CONTRACT_ADDRESSES.NFT_CONTRACT,
        mintCallData as `0x${string}`
      );

      if (hash) {
        toast.success("NFTが正常に作成されました！");

        // フォームをリセット
        setFormData({
          name: "",
          description: "",
          image: null,
          attributes: [],
        });
        setPreviewUrl("");
      }
    } catch (error) {
      console.error("NFT作成エラー:", error);
      toast.error("NFTの作成に失敗しました");
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
            <CardDescription>NFTを作成するにはウォレットを接続してください</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              NFTを作成
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              あなたのデジタルアート作品をNFTとして世界に発信しましょう
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* フォーム */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                <CardTitle className="text-xl">NFT情報</CardTitle>
                <CardDescription>NFTの詳細情報を入力してください</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 名前 */}
                <div>
                  <label htmlFor="nftName" className="block text-sm font-medium mb-2 text-gray-700">
                    名前 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="nftName"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="NFTの名前を入力"
                  />
                </div>

                {/* 説明 */}
                <div>
                  <label
                    htmlFor="nftDescription"
                    className="block text-sm font-medium mb-2 text-gray-700"
                  >
                    説明 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="nftDescription"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                    placeholder="NFTについて説明してください"
                  />
                </div>

                {/* 画像アップロード */}
                <div>
                  <label
                    htmlFor="nftImage"
                    className="block text-sm font-medium mb-2 text-gray-700"
                  >
                    画像 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="nftImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                </div>

                {/* 属性 */}
                <div>
                  <div className="block text-sm font-medium mb-3 text-gray-700">
                    属性 (オプション)
                  </div>

                  {/* 既存の属性 */}
                  {formData.attributes.map((attr) => (
                    <div
                      key={`${attr.trait_type}-${attr.value}`}
                      className="flex items-center gap-3 mb-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="bg-white border border-gray-200 px-3 py-2 rounded-md text-sm flex-1 font-medium">
                        {attr.trait_type}: {attr.value}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAttribute(formData.attributes.indexOf(attr))}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        削除
                      </Button>
                    </div>
                  ))}

                  {/* 新しい属性追加 */}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newAttribute.trait_type}
                      onChange={(e) =>
                        setNewAttribute((prev) => ({ ...prev, trait_type: e.target.value }))
                      }
                      placeholder="属性名"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      aria-label="属性名"
                    />
                    <input
                      type="text"
                      value={newAttribute.value}
                      onChange={(e) =>
                        setNewAttribute((prev) => ({ ...prev, value: e.target.value }))
                      }
                      placeholder="値"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      aria-label="属性値"
                    />
                    <Button
                      type="button"
                      onClick={addAttribute}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                    >
                      追加
                    </Button>
                  </div>
                </div>

                {/* 作成ボタン */}
                <Button
                  onClick={mintNFT}
                  disabled={isCreating}
                  className="w-full text-white font-semibold"
                  style={{
                    background: "linear-gradient(to right, #8B5CF6, #06B6D4)",
                  }}
                >
                  {isCreating ? "NFT作成中..." : "NFTを作成する (0.01 ETH)"}
                </Button>
              </CardContent>
            </Card>

            {/* プレビュー */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <CardTitle className="text-xl">プレビュー</CardTitle>
                <CardDescription>作成されるNFTのプレビューです</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 画像プレビュー */}
                  <div className="w-full max-w-md mx-auto">
                    <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl overflow-hidden">
                      {previewUrl ? (
                        <Image
                          src={previewUrl}
                          alt="NFT Preview"
                          width={400}
                          height={400}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <svg
                            className="w-12 h-12 mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-label="画像アップロード"
                          >
                            <title>画像アップロード</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <p className="text-sm">画像を選択してください</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* メタデータプレビュー */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">
                        {formData.name || "NFT名"}
                      </h3>
                      <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                        {formData.description || "NFTの説明がここに表示されます"}
                      </p>
                    </div>

                    {formData.attributes.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-3">属性</p>
                        <div className="grid grid-cols-2 gap-2">
                          {formData.attributes.map((attr) => (
                            <div
                              key={`preview-${attr.trait_type}-${attr.value}`}
                              className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3"
                            >
                              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                {attr.trait_type}
                              </p>
                              <p className="text-sm font-semibold text-gray-900 mt-1">
                                {attr.value}
                              </p>
                            </div>
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
