// import libraries
import { Link, Outlet, useLocation } from "react-router";

// import utils
import { docsPath, isCurrentPath } from "../lib/docs.util.ts";

// import views
import { Disclosure } from "../components/disclosure.view.tsx";

// import consts
import { DOCS_PAGES } from "../lib/docs.consts.ts";

const linkClass = (isCurrent: boolean) =>
  `block min-h-11 rounded-lg px-3 py-2.5 font-semibold ${isCurrent ? "bg-cream text-ink" : "text-muted hover:text-ink"}`;

function DocsLinks() {
  const { pathname } = useLocation();
  return DOCS_PAGES.map(({ slug, title }) => {
    const path = docsPath(slug);
    const isCurrent = isCurrentPath({ pathname, path });
    return (
      <Link
        key={slug}
        to={path}
        className={linkClass(isCurrent)}
        aria-current={isCurrent ? "page" : undefined}
      >
        {title}
      </Link>
    );
  });
}

export default function Docs() {
  return (
    <div className="mx-auto grid max-w-[1120px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-12 md:py-16">
      <aside className="md:sticky md:top-24 md:self-start">
        <Disclosure
          className="rounded-xl border-2 border-ink md:hidden"
          summaryClassName="flex min-h-11 cursor-pointer items-center px-4 font-bold"
          summary="Docs pages"
        >
          <nav className="px-2 pb-2" aria-label="Docs">
            <DocsLinks />
          </nav>
        </Disclosure>
        <nav className="hidden md:block" aria-label="Docs">
          <DocsLinks />
        </nav>
      </aside>
      <Outlet />
    </div>
  );
}
