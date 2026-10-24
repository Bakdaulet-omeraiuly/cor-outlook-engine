import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const engineSrc = path.resolve(__dirname, "..", "src");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static HTML export: the demo is fully client-side (Monte Carlo runs in the
  // browser), so it can ship as static files with no Next.js server.
  output: "export",
  images: { unoptimized: true },
  // Type-checking and linting are run as separate CI gates (`npm run typecheck`
  // and `npm run lint`). We skip them during `next build` because the library
  // source is imported from ../src, whose bare type imports (e.g. "zod")
  // resolve differently under Vercel's web-only install. Runtime module
  // resolution is handled by the webpack config below.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
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
    // The engine source lives outside /web; ensure its bare imports (e.g.
    // "zod") resolve against the web app's node_modules.
    const webNodeModules = path.resolve(__dirname, "node_modules");
    config.resolve.modules = [
      webNodeModules,
      ...(config.resolve.modules ?? ["node_modules"]),
    ];
    return config;
  },
};

export default nextConfig;
