// import libraries
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// import consts
import { SITE_ALIASES } from "./aliases.config.ts";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: { alias: SITE_ALIASES },
});
