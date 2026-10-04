// The site's Content-Security-Policy, built from the pre-rendered pages: every
// inline script and style React Router and the layout put on a page is allowed
// by its SHA-256 hash, and nothing else inline runs. Pure, so it's tested;
// scripts/write-csp.mts writes it into build/client/_headers after a build.
// import libraries
import { createHash } from "node:crypto";

/** What a page carries inline: its scripts' and styles' text, and how many style attributes. */
export interface InlineSources {
  scripts: string[];
  styles: string[];
  styleAttributes: number;
}

/** The inline scripts (no `src`) and `<style>` blocks of a page, in any letter case, and its style attributes. */
export function inlineSources(html: string): InlineSources {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)]
    .filter(([, attributes = ""]) => !/\ssrc\s*=/i.test(attributes))
    .map(([, , body = ""]) => body);
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\b[^>]*>/gi)].map(
    ([, body = ""]) => body,
  );
  const styleAttributes = [...html.matchAll(/<[a-z][^>]*\sstyle\s*=/gi)].length;
  return { scripts, styles, styleAttributes };
}

/** A CSP source for the text's SHA-256: `'sha256-<base64>'`. */
export function sha256Source(text: string): string {
  return `'sha256-${createHash("sha256").update(text).digest("base64")}'`;
}

interface SitePolicyArgs {
  /** Every inline script's text, across all pages. */
  scripts: readonly string[];
  /** Every inline style's text, across all pages. */
  styles: readonly string[];
}

/** The hashes of the texts, each once, sorted so the policy doesn't change with page order. */
function hashes(texts: readonly string[]): string {
  return [...new Set(texts.map(sha256Source))].toSorted().join(" ");
}

/** The site's whole policy: its own files, the hashed inline scripts and styles, and no framing. */
export function sitePolicy({ scripts, styles }: SitePolicyArgs): string {
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes(scripts)}`.trimEnd(),
    `style-src 'self' ${hashes(styles)}`.trimEnd(),
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
  ].join("; ");
}

interface WithPolicyArgs {
  /** A Netlify _headers file whose `/*` rule has a Content-Security-Policy line. */
  headers: string;
  policy: string;
}

/** The _headers file with its Content-Security-Policy line replaced by the policy. Throws when it has none. */
export function withPolicy({ headers, policy }: WithPolicyArgs): string {
  const line = /^( +)Content-Security-Policy: .*/m;
  if (!line.test(headers)) {
    throw new Error("_headers has no Content-Security-Policy line to replace");
  }
  return headers.replace(
    line,
    (_match, indent: string) => `${indent}Content-Security-Policy: ${policy}`,
  );
}

/** The headers a Netlify _headers file sets for every path (its `/*` rule), by name. */
export function headersForAll(headers: string): Record<string, string> {
  const [, rule = ""] = /^\/\*\n((?:[ \t].*\n?)*)/m.exec(headers) ?? [];
  return Object.fromEntries(
    rule.split("\n").flatMap((line) => {
      const [, name = "", value = ""] = /^\s+([\w-]+):\s*(.*)/.exec(line) ?? [];
      return name === "" ? [] : [[name, value]];
    }),
  );
}
