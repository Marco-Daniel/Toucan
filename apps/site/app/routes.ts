// import libraries
import { index, route } from "@react-router/dev/routes";

// import types
import type { RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("docs", "routes/docs.tsx", [
    index("routes/docsPage.tsx", { id: "docs-index" }),
    route(":slug", "routes/docsPage.tsx", { id: "docs-page" }),
  ]),
  route("changelog", "routes/changelog.tsx"),
  // Any other path: Netlify serves the SPA fallback for it (public/_redirects), which renders this.
  route("*", "routes/notFound.tsx"),
] satisfies RouteConfig;
