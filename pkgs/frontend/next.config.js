/** @type {import('next').NextConfig} */
const nextConfig = {
  // ビルド品質のチェック
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // 環境変数の設定
  env: {
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    NEXT_PUBLIC_BICONOMY_BUNDLER_API_KEY: process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_API_KEY,
    NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY: process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY,
  },

  // WebpackのカスタムConfig（ZKアーティファクト用）
  webpack: (config, { isServer }) => {
    // ZKアーティファクト（.wasm, .zkey）のハンドリング
    config.module.rules.push({
      test: /\.(wasm|zkey)$/,
      type: "asset/resource",
      generator: {
        filename: "static/chunks/[name].[hash][ext]",
      },
    });

    // サーバーサイドでsnarkjsを外部化
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("snarkjs");
    }

    // Node.js polyfillsの無効化（ブラウザ互換性）
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },

  // 実験的機能
  experimental: {
    turbo: {
      // TurboPack設定
    },
  },
};

module.exports = nextConfig;
