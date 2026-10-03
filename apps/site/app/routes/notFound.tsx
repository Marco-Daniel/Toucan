// import utils
import { pageMeta } from "../lib/meta.util.ts";

// import views
import { NotFound } from "../components/notFound.view.tsx";

// import consts
import ICON_PNG from "@extension-media/icon.png?url";

export function meta() {
  return pageMeta({
    title: "Page not found",
    description: "There's nothing at this address.",
    path: "/404",
    image: ICON_PNG,
  });
}

export default function NotFoundPage() {
  return <NotFound />;
}
