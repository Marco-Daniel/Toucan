// import consts
import { DOCS_PAGES } from "./docs.consts.ts";

/** A docs page's path: the first page is /docs itself. */
export function docsPath(slug: string): string {
  return slug === DOCS_PAGES[0]?.slug ? "/docs" : `/docs/${slug}`;
}

interface IsCurrentPathArgs {
  /** The location's path. */
  pathname: string;
  /** A docs page's path, as docsPath gives it. */
  path: string;
}

/** Whether a location is this docs path, with or without a trailing slash (the pre-rendered pages have one). */
export function isCurrentPath({ pathname, path }: IsCurrentPathArgs): boolean {
  return pathname.replace(/(?<=.)\/$/, "") === path;
}

/** Whether a slug names a docs page under /docs; the first page is /docs itself, not /docs/<its slug>. */
export function isDocsSlug(slug: string): boolean {
  return DOCS_PAGES.slice(1).some((page) => page.slug === slug);
}
