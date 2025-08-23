import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>AMM DEX - ホーム</title>
        <meta name="description" content="UniswapライクなAMM DEXのホームページ" />
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">AMM DEX</h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">UniswapライクなAMM分散型取引所</p>
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">開発中</h2>
              <p className="text-gray-600">
                現在、AMM DEXの開発を進めています。
                <br />
                スマートコントラクトとフロントエンドの実装が完了次第、
                <br />
                ウォレット接続とトークンスワップ機能をご利用いただけます。
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
