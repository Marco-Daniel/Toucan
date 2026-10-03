// import views
import { NotFound } from "../components/notFound.view.tsx";

export function meta() {
  return [
    { title: "Page not found · Toucan" },
    { name: "description", content: "There's nothing at this address." },
    { name: "robots", content: "noindex" },
  ];
}

export default function NotFoundPage() {
  return <NotFound />;
}
