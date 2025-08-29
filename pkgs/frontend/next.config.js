/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '11155111',
    NEXT_PUBLIC_RPC_URL:
      process.env.NEXT_PUBLIC_RPC_URL ||
      'https://eth-sepolia.g.alchemy.com/v2/YOUR-PROJECT-ID',
  },
};

module.exports = nextConfig;
