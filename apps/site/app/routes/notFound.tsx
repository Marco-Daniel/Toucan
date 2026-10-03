// import utils
import { pageMeta } from "../lib/meta.util.ts";

// import views
import { NotFound } from "../components/notFound.view.tsx";

export function meta() {
  return pageMeta({
    title: "Page not found",
    description: "There's nothing at this address.",
    path: "/404",
  });
}

export default function NotFoundPage() {
  return <NotFound />;
}
