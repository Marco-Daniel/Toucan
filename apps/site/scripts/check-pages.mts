// `pnpm -C apps/site check:pages`, after a build: checks the built site as a
// browser would meet it. build/client holds exactly the expected pages; each
// has its title, description, canonical URL and Open Graph image; every link
// within the site reaches a page (and its heading, for a #fragment) or a
// built file; and no page repeats an id. CI runs it after the build.
// import libraries
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// import consts
import { PAGE_PATHS } from "../app/lib/pages.consts.ts";
import { SITE_URL } from "../app/lib/site.consts.ts";

const CLIENT = new URL("../build/client/", import.meta.url).pathname;
const OG_IMAGE = `${SITE_URL}/og-image.png`.replaceAll(".", "\\.");

/** A page's built file: /path → path/index.html. */
function pageFile(path: string): string {
  return join(CLIENT, path, "index.html");
}

interface PageProblemsArgs {
  path: string;
  html: string;
  /** Every built page's HTML by path, to check links and anchors against. */
  pages: ReadonlyMap<string, string>;
}

/** What's wrong with one built page. */
function pageProblems({ path, html, pages }: PageProblemsArgs): string[] {
  const problems: string[] = [];
  const need = (label: string, pattern: RegExp) => {
    if ([...html.matchAll(pattern)].length !== 1) {
      problems.push(`${path}: expected one ${label}`);
    }
  };
  need("title", /<title>[^<]+<\/title>/g);
  need("description", /<meta name="description" content="[^"]+"/g);
  need("canonical URL", new RegExp(`<link rel="canonical" href="${SITE_URL}${path}"`, "g"));
  need("Open Graph image", new RegExp(`<meta property="og:image" content="${OG_IMAGE}"`, "g"));
  need(
    "Open Graph image size",
    /<meta property="og:image:width" content="1200"\/><meta property="og:image:height" content="630"\/>/g,
  );
  need(
    "Twitter card",
    new RegExp(
      `<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:image" content="${OG_IMAGE}"`,
      "g",
    ),
  );

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
  for (const id of new Set(ids.filter((each, index) => ids.indexOf(each) !== index))) {
    problems.push(`${path}: id "${id}" is used more than once`);
  }

  for (const [, target = ""] of html.matchAll(/\s(?:href|src)="(\/[^"]*)"/g)) {
    const [route = "", anchor] = target.split("#");
    const page = pages.get(route.replace(/(?<=.)\/$/, ""));
    if (page !== undefined) {
      if (anchor !== undefined && anchor !== "" && !page.includes(` id="${anchor}"`)) {
        problems.push(`${path}: ${target} has no such heading`);
      }
    } else if (!existsSync(join(CLIENT, route))) {
      problems.push(`${path}: ${target} leads nowhere`);
    }
  }
  return problems;
}

const built = readdirSync(CLIENT, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith("index.html"))
  .map((file) => `/${file.slice(0, -"index.html".length)}`.replace(/(?<=.)\/$/, ""))
  .toSorted();
const problems: string[] = [];
if (JSON.stringify(built) !== JSON.stringify([...PAGE_PATHS].toSorted())) {
  problems.push(`Built pages ${built.join(", ")} aren't the expected ${PAGE_PATHS.join(", ")}`);
}
const pages = new Map(PAGE_PATHS.map((path) => [path, readFileSync(pageFile(path), "utf8")]));
for (const [path, html] of pages) {
  problems.push(...pageProblems({ path, html, pages }));
}
if (!existsSync(join(CLIENT, "og-image.png"))) {
  problems.push("og-image.png, every page's card, isn't in the build");
}
if (readFileSync(join(CLIENT, "404.html"), "utf8") !== pages.get("/404")) {
  problems.push("404.html isn't the /404 page");
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`${pages.size} pages checked: titles, descriptions, links, anchors and ids`);
