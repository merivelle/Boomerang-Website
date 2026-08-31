/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // 75 is the default for the grid; 90 is used for the full-height hero stills.
    qualities: [75, 90],
    // An exact hostname, never a wildcard: the image optimizer must not be
    // aimable at an arbitrary host. Uploaded posters live here; the 110
    // original assets keep serving from /public.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "aojqwzhztfimiuhnbiad.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Vercel meters image transformations, so the optimized variants should stick.
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },
  // three + its example modules ship untranspiled ESM; let Next compile them.
  transpilePackages: ["three", "three-stdlib"],
};

export default nextConfig;
