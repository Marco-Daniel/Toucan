// import utils
import { docsPath } from "./docs.util.ts";

// import consts
import { DOCS_PAGES } from "./docs.consts.ts";

/** Every page the site pre-renders, by path. */
export const PAGE_PATHS: readonly string[] = [
  "/",
  "/changelog",
  ...DOCS_PAGES.map(({ slug }) => docsPath(slug)),
];
