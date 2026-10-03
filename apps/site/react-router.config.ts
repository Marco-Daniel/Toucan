// import utils
import { docsPath } from "./app/lib/docs.util.ts";

// import consts
import { DOCS_PAGES } from "./app/lib/docs.consts.ts";

// import types
import type { Config } from "@react-router/dev/config";

export default {
  // A static site: every page is rendered at build time, nothing runs on a server (website/0001).
  ssr: false,
  prerender: ({ getStaticPaths }) => [
    ...getStaticPaths(),
    ...DOCS_PAGES.map(({ slug }) => docsPath(slug)).filter((path) => path !== "/docs"),
  ],
} satisfies Config;
