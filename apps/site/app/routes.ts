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
  // Pre-rendered once; the build copies it to 404.html, which Netlify serves for any unknown path.
  route("404", "routes/notFound.tsx"),
] satisfies RouteConfig;
