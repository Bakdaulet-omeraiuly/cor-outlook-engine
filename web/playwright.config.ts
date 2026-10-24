import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against the static export. Assumes `npm run build` has produced `out/`.
 * Serves it with `npx serve` on port 4321.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4321",
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        launchOptions: {
          args: [
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
            "--ignore-gpu-blocklist",
          ],
        },
      },
    },
  ],
  webServer: {
    command: "npx --yes serve out -l 4321",
    url: "http://localhost:4321",
    timeout: 60_000,
    reuseExistingServer: true,
  },
});
