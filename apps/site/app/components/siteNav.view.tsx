// import libraries
import { Link } from "react-router";

// import views
import { Disclosure } from "./disclosure.view.tsx";
import { Logo } from "./logo.view.tsx";
import { MenuIcon } from "./menuIcon.view.tsx";

// import consts
import { REPO_URL } from "../lib/site.consts.ts";

const LINKS = [
  { label: "Features", to: "/#features" },
  { label: "Glyphs", to: "/#glyphs" },
  { label: "Docs", to: "/docs" },
  { label: "Changelog", to: "/changelog" },
] as const;

/** The sticky top bar, with the beak's bands along its bottom edge. */
export function SiteNav() {
  return (
    <nav className="sticky top-0 z-10 bg-paper/90 backdrop-blur-md" aria-label="Site">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-3 px-4 sm:px-6 md:gap-7">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2.5 text-xl font-extrabold tracking-tight"
        >
          <Logo id="nav-logo" className="size-[34px]" />
          Toucan
        </Link>
        <div className="ml-auto hidden gap-5 text-[15px] font-semibold md:flex">
          {LINKS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className="inline-flex min-h-11 items-center opacity-80 hover:opacity-100"
            >
              {label}
            </Link>
          ))}
          <a
            href={REPO_URL}
            className="inline-flex min-h-11 items-center opacity-80 hover:opacity-100"
          >
            GitHub
          </a>
        </div>
        <Link
          to="/#install"
          className="ml-auto inline-flex min-h-11 items-center rounded-[10px] border-2 border-ink bg-ink px-3.5 text-sm font-bold text-cream md:ml-0"
        >
          Install
        </Link>
        <Disclosure
          className="relative md:hidden"
          summaryClassName="flex size-11 cursor-pointer list-none items-center justify-center rounded-[10px] border-2 border-ink [&::-webkit-details-marker]:hidden"
          summary={<MenuIcon />}
          label="Menu"
        >
          <div className="absolute right-0 mt-2 flex w-48 flex-col rounded-xl border-2 border-ink bg-paper py-1 shadow-[4px_4px_0_var(--color-amber)]">
            {LINKS.map(({ label, to }) => (
              <Link key={to} to={to} className="min-h-11 px-4 py-2.5 font-semibold">
                {label}
              </Link>
            ))}
            <a href={REPO_URL} className="min-h-11 px-4 py-2.5 font-semibold">
              GitHub
            </a>
          </div>
        </Disclosure>
      </div>
      <div className="beak-band h-1" />
    </nav>
  );
}
