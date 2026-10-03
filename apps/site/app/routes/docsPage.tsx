// import libraries
import { data } from "react-router";

// import utils
import { renderMarkdown } from "../lib/markdown.util.ts";
import { pageMeta } from "../lib/meta.util.ts";
import { docsPage } from "../lib/docs.content.ts";
import { docsPath, isDocsSlug } from "../lib/docs.util.ts";

// import views
import { BuildMarkup } from "../components/buildMarkup.view.tsx";
import { GlyphShowcase } from "../components/glyphShowcase.view.tsx";

// import consts
import { DOCS_IMAGES } from "../lib/screenshots.server.ts";
import { DOCS_PAGES } from "../lib/docs.consts.ts";

// import types
import type { Route } from "./+types/docsPage";

export function loader({ params }: Route.LoaderArgs) {
  const slug = params.slug ?? DOCS_PAGES[0]?.slug ?? "";
  const found = params.slug === undefined || isDocsSlug(params.slug) ? docsPage(slug) : undefined;
  if (found === undefined) {
    throw data(null, { status: 404 });
  }
  const { page, markdown } = found;
  return { page, html: renderMarkdown({ markdown, images: DOCS_IMAGES }) };
}

/**
 * In the browser: a slug the docs don't have is a 404 at once. Only the real
 * pages are pre-rendered, so asking for its data would get the SPA fallback's
 * HTML instead, and an error rather than the not-found page.
 */
export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  if (params.slug !== undefined && !isDocsSlug(params.slug)) {
    throw data(null, { status: 404 });
  }
  return serverLoader();
}

export function meta({ loaderData }: Route.MetaArgs) {
  const { page } = loaderData;
  return pageMeta({
    title: page.title,
    description: page.description,
    path: docsPath(page.slug),
  });
}

export default function DocsPage({ loaderData }: Route.ComponentProps) {
  const { page, html } = loaderData;
  return (
    <article className="min-w-0">
      <h1 className="beak-marker text-4xl font-extrabold tracking-tight sm:text-5xl">
        {page.title}
      </h1>
      <p className="mt-3 text-lg text-muted">{page.description}</p>
      <BuildMarkup className="prose block" html={html} />
      {page.slug === "glyphs" ? (
        <div className="mt-8 rounded-2xl bg-ink p-5 text-cream sm:p-6">
          <GlyphShowcase />
        </div>
      ) : null}
    </article>
  );
}
