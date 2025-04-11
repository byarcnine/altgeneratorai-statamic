import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import vue from "@vitejs/plugin-vue2";
import path from "path";

export default defineConfig({
    plugins: [
        laravel({
            input: ["resources/js/app.js"],
            publicDirectory: "resources/dist",
            // valetTls: "arc-testing.test",
        }),
        vue(),
    ],
    // resolve: {
    //     alias: {
    //         "@": path.resolve(__dirname, "./resources/js"),
    //     },
    // },
    // build: {
    //     outDir: "resources/dist",
    //     emptyOutDir: true,
    //     manifest: true,
    // },
    server: {
        hmr: {
            host: "localhost",
        },
        cors: true,
    },
});
