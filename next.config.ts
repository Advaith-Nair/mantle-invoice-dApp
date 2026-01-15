/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Ignore TypeScript Errors (This key still works)
  typescript: {
    ignoreBuildErrors: true,
  },
  // 2. The Critical Webpack Fix
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