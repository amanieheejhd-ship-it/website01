/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for a small non-root production image (infra/docker/frontend.Dockerfile).
  output: 'standalone',
  // Overridable so CI/acceptance can `next build` into an isolated dir while `next dev` keeps
  // serving from .next (they clobber each other's artifacts on a shared dir). Defaults unchanged.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // The dev laptop is CPU/RAM-starved: prerender attempts can exceed Next's default 60s cap when the
  // export workers contend with the compiler, which aborts the whole build. Give attempts headroom.
  staticPageGenerationTimeout: 240,
  // Workspace TS packages are consumed as source, so Next must transpile them.
  transpilePackages: ['@fardeen/ui', '@fardeen/types', '@fardeen/utils', '@fardeen/config'],
  images: {
    formats: ['image/avif', 'image/webp'],
    // Resolved media urls are presigned MinIO objects. Allowed so next/image doesn't hard-error;
    // bytes may still 404 (no assets uploaded yet) → the client MediaImage falls back to a gradient.
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '9000', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '9000', pathname: '/**' },
      { protocol: 'https', hostname: 'images.pexels.com', pathname: '/photos/**' },
    ],
  },
  experimental: {
    optimizePackageImports: ['@fardeen/ui'],
    // One export worker: parallel prerender workers thrash this machine and time out.
    cpus: 1,
  },
};

export default nextConfig;
