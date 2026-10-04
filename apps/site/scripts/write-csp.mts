// Runs after `react-router build`: hashes every inline script and style in
// the pre-rendered pages (the SPA fallback included) and writes the site's
// Content-Security-Policy into build/client/_headers. The pages change with
// every build, so the hashes are made here, never copied by hand.
// import libraries
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// import utils
import { inlineSources, sitePolicy, withPolicy } from "./csp.mts";

const CLIENT = new URL("../build/client/", import.meta.url).pathname;

const pages = readdirSync(CLIENT, { recursive: true, encoding: "utf8" }).filter((file) =>
  file.endsWith(".html"),
);
const sources = pages.map((file) => inlineSources(readFileSync(join(CLIENT, file), "utf8")));
const withStyleAttributes = pages.filter((_, index) => (sources[index]?.styleAttributes ?? 0) > 0);
if (withStyleAttributes.length > 0) {
  console.error(`Style attributes would need 'unsafe-inline': ${withStyleAttributes.join(", ")}`);
  process.exit(1);
}
const policy = sitePolicy({
  scripts: sources.flatMap(({ scripts }) => scripts),
  styles: sources.flatMap(({ styles }) => styles),
});
const file = join(CLIENT, "_headers");
writeFileSync(file, withPolicy({ headers: readFileSync(file, "utf8"), policy }));
console.log(`build/client/_headers: a Content-Security-Policy for ${pages.length} pages`);
