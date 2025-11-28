import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'v5.airtableusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'dl.airtable.com',
      },
      {
        protocol: 'https',
        hostname: '*.airtableusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'genvas-saas-stage.s3.ap-northeast-2.amazonaws.com',
      },
    ],
  },
  // Optimize serverless function size
  experimental: {
    serverComponentsExternalPackages: ['canvas', 'ag-psd'],
  },
  // Configure webpack to exclude large dependencies from bundles where not needed
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        canvas: 'canvas',
      });
    }
    return config;
  },
};

export default nextConfig;
