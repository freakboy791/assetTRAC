/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // Ensure consistent port usage
  env: {
    PORT: '3000',
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  // Force deployment trigger
  generateBuildId: async () => {
    return 'deployment-trigger-' + Date.now()
  }
};

module.exports = nextConfig;
