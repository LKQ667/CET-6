/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "pdfkit"],
  experimental: {
    optimizePackageImports: ["date-fns", "date-fns-tz"]
  },
  headers: async () => {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
