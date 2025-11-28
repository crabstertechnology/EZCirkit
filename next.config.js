/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Disable browser sourcemaps to avoid Windows sourcemap crash
  productionBrowserSourceMaps: false,

  // Disable ALL sourcemaps including dev
  generateEtags: false,

  // IMPORTANT: Add an empty turbopack config to silence the error
  turbopack: {},

  // Remove webpack completely (Next 16 does NOT support it with Turbopack)
  webpack: undefined,
};

export default nextConfig;
