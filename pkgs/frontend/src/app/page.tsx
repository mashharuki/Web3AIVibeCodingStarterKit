export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">AMM DEX</h1>
          <p className="text-lg text-gray-600 mb-8">
            Automated Market Maker Decentralized Exchange
          </p>
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
            <p className="text-gray-600">
              スワップ機能と流動性プール管理機能を開発中です。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
