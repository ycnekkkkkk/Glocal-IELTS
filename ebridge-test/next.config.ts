import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['googleapis', 'pdfkit'],
};

export default nextConfig;
