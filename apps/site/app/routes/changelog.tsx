// import utils
import { renderMarkdown } from "../lib/markdown.util.ts";
import { pageMeta } from "../lib/meta.util.ts";
import { buildReleases } from "../lib/releases.server.ts";

// import views
import { BuildMarkup } from "../components/buildMarkup.view.tsx";

// import consts
import { RELEASES_URL } from "../lib/site.consts.ts";

// import types
import type { Route } from "./+types/changelog";

const DATE = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

export async function loader() {
  const releases = await buildReleases();
  return {
    releases: releases.map(({ tag, name, publishedAt, url, body }) => ({
      tag,
      name,
      url,
      date: DATE.format(new Date(publishedAt)),
      html: renderMarkdown({ markdown: body, idPrefix: `${tag}-`, headingShift: 1 }),
    })),
  };
}

export function meta() {
  return pageMeta({
    title: "Changelog",
    description: "Every Toucan release and what it changed, from the GitHub release notes.",
    path: "/changelog",
  });
}

export default function Changelog({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mx-auto max-w-[820px] px-4 py-12 sm:px-6 md:py-16">
      <h1 className="beak-marker text-4xl font-extrabold tracking-tight sm:text-5xl">Changelog</h1>
      <p className="mt-3 text-lg text-muted">
        Every release, from its notes on{" "}
        <a href={RELEASES_URL} className="font-semibold underline decoration-amber decoration-2">
          GitHub
        </a>
        .
      </p>
      {loaderData.releases.map(({ tag, name, url, date, html }) => (
        <section key={tag} id={tag} className="mt-12 border-t-2 border-ink pt-8">
          <h2 className="text-3xl font-extrabold tracking-tight">
            <a href={url}>{name}</a>
          </h2>
          <p className="mt-1 text-sm text-muted">
            <time>{date}</time> · {tag}
          </p>
          <BuildMarkup className="prose" html={html} />
        </section>
      ))}
    </div>
  );
}
