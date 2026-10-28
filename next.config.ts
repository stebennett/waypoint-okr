import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Keep the native SQLite driver out of the webpack bundle so its .node binding resolves at runtime
  serverExternalPackages: ['@prisma/adapter-better-sqlite3', 'better-sqlite3'],
}

export default nextConfig
