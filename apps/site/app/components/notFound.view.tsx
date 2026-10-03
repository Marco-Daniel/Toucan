// import libraries
import { Link } from "react-router";

export function NotFound() {
  return (
    <main className="mx-auto max-w-[1120px] px-4 py-24 sm:px-6">
      <h1 className="beak-marker text-4xl font-extrabold tracking-tight sm:text-5xl">
        This page flew off.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        There's nothing at this address. The docs and the changelog are a good place to look.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center rounded-[10px] border-2 border-ink bg-ink px-4 font-bold text-cream"
        >
          Home
        </Link>
        <Link
          to="/docs"
          className="inline-flex min-h-11 items-center rounded-[10px] border-2 border-ink px-4 font-bold"
        >
          Docs
        </Link>
      </div>
    </main>
  );
}
