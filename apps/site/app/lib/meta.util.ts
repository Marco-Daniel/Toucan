// import consts
import { SITE_URL } from "./site.consts.ts";

interface PageMetaArgs {
  /** The page's own title; the site name is added. */
  title: string;
  description: string;
  /** The page's path, for its canonical and Open Graph URL. */
  path: string;
  /** The Open Graph image, a path on the site. */
  image: string;
}

/** A page's title, description and Open Graph tags. */
export function pageMeta({ title, description, path, image }: PageMetaArgs) {
  const fullTitle = title === "Toucan" ? title : `${title} · Toucan`;
  return [
    { title: fullTitle },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Toucan" },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:url", content: `${SITE_URL}${path}` },
    { property: "og:image", content: `${SITE_URL}${image}` },
    { tagName: "link", rel: "canonical", href: `${SITE_URL}${path}` },
  ];
}
