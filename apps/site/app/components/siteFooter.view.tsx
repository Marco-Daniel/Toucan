// import libraries
import { Link } from "react-router";

// import views
import { Logo } from "./logo.view.tsx";

// import consts
import { REPO_URL } from "../lib/site.consts.ts";

export function SiteFooter() {
  return (
    <footer className="border-t border-line pt-9 pb-12 text-sm text-muted">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-5 px-4 sm:px-6">
        <Logo id="footer-logo" className="size-[26px]" />
        <span>Toucan · MIT licensed</span>
        <Link to="/docs" className="inline-flex min-h-11 items-center">
          Docs
        </Link>
        <Link to="/changelog" className="inline-flex min-h-11 items-center">
          Changelog
        </Link>
        <a href={REPO_URL} className="inline-flex min-h-11 items-center">
          GitHub
        </a>
        <span className="sm:ml-auto">Built with React Router and Tailwind</span>
      </div>
    </footer>
  );
}
