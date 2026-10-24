import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const engineSrc = path.resolve(__dirname, "..", "src");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The library is authored in ESM TypeScript with explicit ".js" import
  // specifiers (NodeNext style). We import its source directly (src/ stays
  // untouched) and let Next's compiler handle it.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@engine": engineSrc,
    };
    // Resolve ".js" specifiers in the engine source to the real ".ts" files.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
