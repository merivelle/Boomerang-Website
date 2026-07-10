/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // 75 is the default for the grid; 90 is used for the full-height hero stills.
    qualities: [75, 90],
  },
  // three + its example modules ship untranspiled ESM; let Next compile them.
  transpilePackages: ["three", "three-stdlib"],
};

export default nextConfig;
