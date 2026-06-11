import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const exampleDir = fileURLToPath(new URL("./", import.meta.url));
const rootDir = path.resolve(exampleDir, "../..");

export default defineConfig({
  plugins: [tailwindcss()],
  root: exampleDir,
  resolve: {
    alias: {
      "@moritzbrantner/graph-editor/core": path.resolve(rootDir, "src/core.ts"),
      "@moritzbrantner/graph-editor/layout": path.resolve(rootDir, "src/layout.ts"),
      "@moritzbrantner/graph-editor/react": path.resolve(rootDir, "src/react.tsx"),
      "@moritzbrantner/graph-editor": path.resolve(rootDir, "src/index.ts"),
      "@moritzbrantner/ui": path.resolve(rootDir, "node_modules/@moritzbrantner/ui"),
      "lucide-react": path.resolve(rootDir, "node_modules/lucide-react"),
      react: path.resolve(rootDir, "node_modules/react"),
      "react-dom": path.resolve(rootDir, "node_modules/react-dom"),
    },
    dedupe: ["@moritzbrantner/ui", "react", "react-dom"],
  },
  server: {
    fs: {
      allow: [rootDir],
    },
    host: "0.0.0.0",
    port: 5173,
  },
});
