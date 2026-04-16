import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    clearMocks: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    mockReset: true,
    restoreMocks: true,
  },
});
