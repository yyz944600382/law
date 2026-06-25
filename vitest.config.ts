import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 真实测试:LLM/联网较慢,给足超时
    testTimeout: 90000,
    setupFiles: ["./tests/setup.ts"],
  },
});
