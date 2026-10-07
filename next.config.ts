import type { NextConfig } from "next";
import { validateBuildEnv } from "./src/lib/shared/build-env";

// Next has loaded .env.local by now. A missing or malformed key stops the build here (src/lib/shared/build-env.ts).
validateBuildEnv(process.env);

const nextConfig: NextConfig = {
  // Static HTML export: the hosting serves PHP and static files only, no Node.js runtime.
  output: "export",
  // Emit /page/index.html so Apache serves directories without rewrite rules.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
