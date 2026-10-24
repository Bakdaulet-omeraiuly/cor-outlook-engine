import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // Mirror the web app's "@engine" alias so the web wiring tests can run
      // under the single root test runner against the untouched library source.
      "@engine": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts", "web/app/**/*.test.ts"],
    environment: "node",
  },
});
