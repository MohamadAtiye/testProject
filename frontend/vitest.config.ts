import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The app imports assets from the public dir by absolute path
    // (e.g. "/images/logo-dark.png"). Point that at the real folder for tests.
    alias: {
      "/images": fileURLToPath(new URL("./public/images", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
