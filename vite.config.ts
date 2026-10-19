import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/Model-motion/",
  test: {
    // Media archive .test.js files use node:test and are run independently by Node.
    exclude: [...configDefaults.exclude, "functions/core/media/**/*.test.js"],
  },
});
