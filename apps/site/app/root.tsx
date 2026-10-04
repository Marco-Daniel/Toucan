// import libraries
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

// import utils
import { brandCssVariables, presetCssClasses } from "./lib/theme.util.ts";

// import views
import { NotFound } from "./components/notFound.view.tsx";
import { SiteFooter } from "./components/siteFooter.view.tsx";
import { SiteNav } from "./components/siteNav.view.tsx";

// import consts
import { BRAND_COLORS } from "@toucan/brand/colors.consts.ts";
import { BRAND_PRESETS } from "@toucan/brand/presets.consts.ts";
import STYLES from "./app.css?url";

/** The status a path nothing matches gets. */
const NOT_FOUND = 404;

// import types
import type { ReactNode } from "react";
import type { Route } from "./+types/root";

export const links: Route.LinksFunction = () => [{ rel: "stylesheet", href: STYLES }];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={BRAND_COLORS.jungleGreen} />
        <style>{brandCssVariables(BRAND_COLORS) + presetCssClasses(BRAND_PRESETS)}</style>
        <Meta />
        <Links />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only z-20 rounded-lg bg-ink font-bold text-cream focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:px-4 focus:py-3"
        >
          Skip to content
        </a>
        <SiteNav />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <SiteFooter />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/**
 * The SPA fallback page: every real page is pre-rendered, so Netlify only serves
 * the fallback for a path the site doesn't have (public/_redirects). It shows
 * the not-found page before the scripts load, as the catch-all route does after.
 */
export function HydrateFallback() {
  return <NotFound />;
}

/** The fallback's own title; every page sets its own over it. */
export const meta: Route.MetaFunction = () => [
  { title: "Page not found · Toucan" },
  { name: "robots", content: "noindex" },
];

/** A path nothing matches (as the client sees it on Netlify's 404 page), or a build-time error. */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === NOT_FOUND) {
    return <NotFound />;
  }
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6">
      <h1 className="text-4xl font-extrabold">Something went wrong.</h1>
    </div>
  );
}
