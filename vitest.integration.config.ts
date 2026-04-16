import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    clearMocks: true,
    environment: "node",
    fileParallelism: false,
    hookTimeout: 30_000,
    include: ["tests/integration/**/*.test.ts"],
    mockReset: true,
    restoreMocks: true,
    setupFiles: ["tests/setup/integration.ts"],
    testTimeout: 30_000,
  },
});
