// Import paths the site's build and its tests both resolve.
// import libraries
import { fileURLToPath } from "node:url";

export const SITE_ALIASES = {
  // The brand's assets by their package path, so import.meta.glob can list the glyphs too.
  "@toucan/brand/assets": fileURLToPath(new URL("../../packages/brand/assets", import.meta.url)),
  // The extension's media: its icon, and the README screenshots `pnpm screenshots` writes there.
  "@extension-media": fileURLToPath(new URL("../extension/media", import.meta.url)),
};
