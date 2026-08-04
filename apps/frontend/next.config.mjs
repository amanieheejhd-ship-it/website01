/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for a small non-root production image (infra/docker/frontend.Dockerfile).
  output: 'standalone',
  // Workspace TS packages are consumed as source, so Next must transpile them.
  transpilePackages: ['@fardeen/ui', '@fardeen/types', '@fardeen/utils', '@fardeen/config'],
  images: {
    formats: ['image/avif', 'image/webp'],
    // Resolved media urls are presigned MinIO objects. Allowed so next/image doesn't hard-error;
    // bytes may still 404 (no assets uploaded yet) → the client MediaImage falls back to a gradient.
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '9000', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '9000', pathname: '/**' },
    ],
  },
  experimental: {
    optimizePackageImports: ['@fardeen/ui'],
  },
};

export default nextConfig;
