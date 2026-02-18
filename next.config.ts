import type { NextConfig } from "next";
import path from "path";

// Force Vercel to rebuild - Updated: 2025-11-05 at 13:45
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Webpack config for production builds
  // Note: Turbopack (used in dev) ignores webpack config and uses serverExternalPackages instead
  // This warning is harmless - webpack config is only used for production builds
  webpack: (config, { isServer }) => {
    // Ensure generated Prisma client resolves correctly
    const prismaPath = path.resolve(__dirname, 'lib/generated/prisma');
    config.resolve.alias = {
      ...config.resolve.alias,
      '.prisma/client': prismaPath,
      '@/lib/generated/prisma': prismaPath,
      'lib/generated/prisma': prismaPath,
      '#prisma': prismaPath,
      // Resolve ./generated/prisma from lib/prisma.ts
    };
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@prisma/client': 'commonjs @prisma/client',
      });
    }
    return config;
  },
  // Turbopack uses this for Prisma handling
  serverExternalPackages: ['@prisma/client'],
  // Configure Turbopack to avoid webpack warning
  turbopack: {
    resolveAlias: {
      '.prisma/client': path.resolve(__dirname, 'lib/generated/prisma'),
      '@/lib/generated/prisma': path.resolve(__dirname, 'lib/generated/prisma'),
      'lib/generated/prisma': path.resolve(__dirname, 'lib/generated/prisma'),
      '#prisma': path.resolve(__dirname, 'lib/generated/prisma'),
    },
  },
  // Skip metadata generation for favicon to avoid cache issues
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
