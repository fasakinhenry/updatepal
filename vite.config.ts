import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // precache static assets only. api responses and private documents are never cached.
      workbox: { navigateFallback: "/index.html", navigateFallbackDenylist: [/^\/api\//], runtimeCaching: [] },
      manifest: {
        name: "updatebase",
        short_name: "updatebase",
        description: "discover opportunities and publish every update from one place.",
        theme_color: "#6903D3",
        background_color: "#F9F1D7",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
      },
    }),
  ],
});
