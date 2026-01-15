import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Ignore TypeScript Errors
  typescript: {
    ignoreBuildErrors: true,
  },
  // 2. Webpack fix for WalletConnect
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

export default nextConfig;