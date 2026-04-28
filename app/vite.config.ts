import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// GitHub project page: https://<user>.github.io/<repo>/
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
const defaultPagesBase = repo ? `/${repo}/` : "/";
const base = process.env.VITE_BASE_PATH ?? defaultPagesBase;

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "spa-github-pages-404",
      closeBundle() {
        const out = resolve(__dirname, "dist/index.html");
        copyFileSync(out, resolve(__dirname, "dist/404.html"));
      },
    },
  ],
  server: {
    port: 5173,
    open: true,
  },
});
