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
  // Disable webpack cache in production to reduce bundle size
  webpack: (config, { isServer, dev }) => {
    // Disable cache in production builds
    if (!dev) {
      config.cache = false;
    }

    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        canvas: 'canvas',
        'ag-psd': 'ag-psd',
      });
    }
    return config;
  },
};

export default nextConfig;
