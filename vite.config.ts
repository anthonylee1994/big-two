/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import {VitePWA} from "vite-plugin-pwa";
import {defineConfig} from "vite";

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: "prompt",
            includeAssets: ["favicon.svg", "icons/icon-192.png", "icons/icon-512.png", "apple-touch-icon.png"],
            manifest: {
                id: "/",
                name: "鋤大D",
                short_name: "鋤大D",
                description: "4 人香港玩法鋤大D，可以同電腦對戰或者開房同朋友網上對戰。",
                start_url: "/",
                scope: "/",
                display: "standalone",
                display_override: ["standalone", "minimal-ui"],
                orientation: "portrait",
                background_color: "#175236",
                theme_color: "#175236",
                lang: "zh-HK",
                dir: "ltr",
                categories: ["games", "entertainment"],
                launch_handler: {client_mode: "navigate-existing"},
                shortcuts: [
                    {name: "同電腦開局", short_name: "電腦對戰", url: "/?start=solo", icons: [{src: "/icons/icon-192.png", sizes: "192x192", type: "image/png"}]},
                    {name: "建立房間", short_name: "開房", url: "/?action=create", icons: [{src: "/icons/icon-192.png", sizes: "192x192", type: "image/png"}]},
                ],
                icons: [
                    {src: "/icons/icon-192.png", sizes: "192x192", type: "image/png"},
                    {src: "/icons/icon-512.png", sizes: "512x512", type: "image/png"},
                    {src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable"},
                ],
            },
        }),
    ],
    server: {
        proxy: {
            "/ws": {
                target: "ws://127.0.0.1:8787",
                ws: true,
            },
        },
    },
    test: {
        include: ["src/**/*.test.ts"],
        environment: "node",
    },
});
