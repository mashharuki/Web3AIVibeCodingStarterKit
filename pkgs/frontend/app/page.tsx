export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="hero-gradient py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            NFTマーケットプレイス
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            モダンで安全なNFT取引プラットフォーム。<br />
            Privyによる認証とBiconomyによるアカウント抽象化で快適な取引体験を提供します。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button type="button" className="bg-white text-nft-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              NFTを探す
            </button>
            <button type="button" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-nft-primary transition-colors">
              NFTを作成
            </button>
          </div>
        </div>
      </section>

      {/* Trending Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">トレンドのNFT</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* NFTカードがここに表示される予定 */}
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="w-full h-48 bg-gray-200 rounded-md mb-4" />
              <h3 className="font-semibold mb-2">サンプルNFT</h3>
              <p className="text-sm text-muted-foreground mb-4">説明文</p>
              <p className="font-bold text-nft-primary">0.1 ETH</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-muted py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="text-3xl font-bold text-nft-primary mb-2">1000+</h3>
              <p className="text-muted-foreground">登録NFT数</p>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-nft-secondary mb-2">500+</h3>
              <p className="text-muted-foreground">アクティブユーザー</p>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-nft-accent mb-2">100+</h3>
              <p className="text-muted-foreground">取引完了数</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
