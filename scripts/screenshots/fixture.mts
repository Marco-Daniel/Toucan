// The README screenshot script's demo repositories: invented, harmless
// projects with neutral names, each in a Toucan preset color with its own
// glyph. The script writes them to a temp folder and removes them afterwards.

export interface DemoRepo {
  name: string;
  background: string;
  glyph: string;
  /** The file each window shows in its editor, as a path in the repository. */
  open: string;
  /** Path to contents. */
  files: Record<string, string>;
}

const JSON_INDENT = 2;

function packageJson(name: string, scripts: Record<string, string>): string {
  return `${JSON.stringify({ name, version: "1.4.0", private: true, type: "module", scripts }, null, JSON_INDENT)}\n`;
}

export const REPOS = [
  {
    name: "webshop",
    background: "#e8579b",
    glyph: "heart",
    open: "src/cart.ts",
    files: {
      "README.md":
        "# webshop\n\nThe storefront: catalog, cart and checkout.\n\nRun `npm run dev` and open http://localhost:5173.\n",
      "package.json": packageJson("webshop", { dev: "vite", build: "vite build", test: "vitest" }),
      "src/cart.ts": `import type { Product } from "./catalog.ts";

export interface CartLine {
  product: Product;
  quantity: number;
}

/** The cart total in cents, before shipping. */
export function total(lines: readonly CartLine[]): number {
  return lines.reduce((sum, { product, quantity }) => sum + product.priceCents * quantity, 0);
}

export function addToCart(lines: CartLine[], product: Product): CartLine[] {
  const line = lines.find((l) => l.product.id === product.id);
  return line
    ? lines.map((l) => (l === line ? { ...l, quantity: l.quantity + 1 } : l))
    : [...lines, { product, quantity: 1 }];
}
`,
      "src/catalog.ts": `export interface Product {
  id: string;
  title: string;
  priceCents: number;
}

export const PRODUCTS: Product[] = [
  { id: "mug", title: "Toucan mug", priceCents: 1499 },
  { id: "tee", title: "Jungle tee", priceCents: 2499 },
  { id: "cap", title: "Canopy cap", priceCents: 1999 },
];
`,
      "test/cart.test.ts": `import { expect, it } from "vitest";
import { addToCart, total } from "../src/cart.ts";
import { PRODUCTS } from "../src/catalog.ts";

it("adds up the cart", () => {
  const [mug] = PRODUCTS;
  expect(total(addToCart(addToCart([], mug!), mug!))).toBe(2998);
});
`,
    },
  },
  {
    name: "payments-api",
    background: "#14939c",
    glyph: "rocket",
    open: "src/routes/payments.ts",
    files: {
      "README.md":
        "# payments-api\n\nA small HTTP API that records payments.\n\nSee https://example.com/docs for the request format.\n",
      "package.json": packageJson("payments-api", { start: "node src/server.ts", test: "vitest" }),
      "src/server.ts": `import { createServer } from "node:http";
import { handlePayment } from "./routes/payments.ts";

const PORT = 8080;

createServer((request, response) => {
  if (request.method === "POST" && request.url === "/payments") {
    handlePayment(request, response);
    return;
  }
  response.writeHead(404).end();
}).listen(PORT);
`,
      "src/routes/payments.ts": `import type { IncomingMessage, ServerResponse } from "node:http";

export interface Payment {
  id: string;
  amountCents: number;
  currency: "EUR" | "USD";
}

const payments: Payment[] = [];

export function handlePayment(request: IncomingMessage, response: ServerResponse): void {
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", () => {
    const payment = JSON.parse(body) as Payment;
    payments.push(payment);
    response.writeHead(201, { "content-type": "application/json" }).end(JSON.stringify(payment));
  });
}
`,
      "test/payments.test.ts": `import { expect, it } from "vitest";

it("accepts euros and dollars", () => {
  expect(["EUR", "USD"]).toContain("EUR");
});
`,
    },
  },
  {
    name: "docs-site",
    background: "#faa404",
    glyph: "leaf",
    open: "docs/getting-started.md",
    files: {
      "README.md": "# docs-site\n\nThe documentation website, built from Markdown.\n",
      "package.json": packageJson("docs-site", {
        build: "node src/build.ts",
        serve: "npx serve out",
      }),
      "docs/getting-started.md": `# Getting started

1. Install the CLI.
2. Run \`demo init\` in an empty folder.
3. Open http://localhost:3000.

## Next steps

- Read the configuration guide.
- Try the examples at https://example.com/examples.
`,
      "docs/configuration.md": "# Configuration\n\nEvery option has a sensible default.\n",
      "src/build.ts": `import { readdirSync, readFileSync, writeFileSync } from "node:fs";

for (const page of readdirSync("docs")) {
  const markdown = readFileSync(\`docs/\${page}\`, "utf8");
  writeFileSync(\`out/\${page.replace(".md", ".html")}\`, \`<article>\${markdown}</article>\`);
}
`,
    },
  },
] as const satisfies readonly DemoRepo[];

export type RepoName = (typeof REPOS)[number]["name"];
