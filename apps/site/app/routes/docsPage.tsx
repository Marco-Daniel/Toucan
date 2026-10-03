// import libraries
import { data } from "react-router";

// import utils
import { renderMarkdown } from "../lib/markdown.util.ts";
import { pageMeta } from "../lib/meta.util.ts";
import { docsPage } from "../lib/docs.content.ts";
import { docsPath } from "../lib/docs.util.ts";

// import views
import { BuildMarkup } from "../components/buildMarkup.view.tsx";
import { GlyphShowcase } from "../components/glyphShowcase.view.tsx";

// import consts
import { SCREENSHOT_URLS } from "../lib/brand.assets.ts";
import { DOCS_PAGES } from "../lib/docs.consts.ts";

// import types
import type { Route } from "./+types/docsPage";

export function loader({ params }: Route.LoaderArgs) {
  const found = docsPage(params.slug ?? DOCS_PAGES[0]?.slug ?? "");
  // /docs/<first page> would duplicate /docs.
  if (found === undefined || (params.slug !== undefined && params.slug === DOCS_PAGES[0]?.slug)) {
    throw data(null, { status: 404 });
  }
  const { page, markdown } = found;
  return { page, html: renderMarkdown({ markdown, images: SCREENSHOT_URLS }) };
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
