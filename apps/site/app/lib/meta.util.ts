// import consts
import { SITE_URL } from "./site.consts.ts";

/** The social media card (scripts/og-image.mts), at the site's root. */
const OG_IMAGE = { url: `${SITE_URL}/og-image.png`, width: "1200", height: "630" } as const;

interface PageMetaArgs {
  /** The page's own title; the site name is added. */
  title: string;
  description: string;
  /** The page's path, for its canonical and Open Graph URL. */
  path: string;
}

/** A page's title, description, canonical URL and social media card. */
export function pageMeta({ title, description, path }: PageMetaArgs) {
  const fullTitle = title === "Toucan" ? title : `${title} · Toucan`;
  return [
    { title: fullTitle },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Toucan" },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:url", content: `${SITE_URL}${path}` },
    { property: "og:image", content: OG_IMAGE.url },
    { property: "og:image:width", content: OG_IMAGE.width },
    { property: "og:image:height", content: OG_IMAGE.height },
    { property: "og:image:alt", content: "Toucan: every repo gets its own color." },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: OG_IMAGE.url },
    { tagName: "link", rel: "canonical", href: `${SITE_URL}${path}` },
  ];
}
