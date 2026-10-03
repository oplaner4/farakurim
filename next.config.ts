import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export: the hosting serves PHP and static files only, no Node.js runtime.
  output: "export",
  // Emit /page/index.html so Apache serves directories without rewrite rules.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
