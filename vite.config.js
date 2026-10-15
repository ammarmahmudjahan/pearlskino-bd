import { defineConfig } from "vite";

/*
 * The libraries (react, the router) rarely change, so they go into their own
 * file. After a new deployment a returning visitor only downloads the small
 * part that actually changed - the libraries come from the phone's cache.
 */
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) return "vendor";
          return undefined;
        },
      },
    },
  },
});
