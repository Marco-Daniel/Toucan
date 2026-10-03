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
import { brandCssVariables } from "./lib/theme.util.ts";

// import views
import { NotFound } from "./components/notFound.view.tsx";
import { SiteFooter } from "./components/siteFooter.view.tsx";
import { SiteNav } from "./components/siteNav.view.tsx";

// import consts
import { BRAND_COLORS } from "@toucan/brand/colors.consts.ts";
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
        <style>{brandCssVariables(BRAND_COLORS)}</style>
        <Meta />
        <Links />
      </head>
      <body>
        <SiteNav />
        {children}
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

/** A path nothing matches (as the client sees it on Netlify's 404 page), or a build-time error. */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === NOT_FOUND) {
    return <NotFound />;
  }
  return (
    <main className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6">
      <h1 className="text-4xl font-extrabold">Something went wrong.</h1>
    </main>
  );
}
