// Toucan's docs in qmd (optional local search): which collections exist, and
// the qmd commands that bring the global qmd config in line with them. qmd's
// config is shared with other projects, so everything here only ever names
// `toucan-*` collections. No qmd calls in this module: the CLI scripts run
// what it plans.
import { matchesGlob, relative } from "node:path";

export interface DocsCollection {
  /** Collection name; always starts with `toucan-`. */
  name: string;
  /** Folder relative to the repo root ("." for the root). */
  dir: string;
  /** qmd glob mask, relative to `dir`. */
  mask: string;
  /** Context per path inside the collection; "" is the collection itself. */
  contexts: Record<string, string>;
}

export const DOCS_COLLECTIONS: readonly DocsCollection[] = [
  {
    name: "toucan-docs",
    dir: "docs",
    mask: "**/*.md",
    contexts: {
      "": "Toucan VS Code extension documentation: architecture decisions and feature plans",
      adr: "System rules and direction for Toucan (binding): architecture decision records",
      plans:
        "Per-feature plan folders: plan, context, progress, trail and the feature's decision records",
    },
  },
  {
    name: "toucan-guides",
    dir: ".",
    mask: "{README.md,GROUNDING.md}",
    contexts: {
      "": "Toucan repo guides: README (usage and development) and GROUNDING (repo facts and quality commands)",
    },
  },
];

/** A collection as qmd has it registered. */
export interface Registered {
  path: string;
  pattern: string;
}

/** Reads `qmd collection show <name>` output; undefined if it lacks a path or pattern. */
export function parseCollectionShow(output: string): Registered | undefined {
  const path = /^\s*Path:\s+(.+?)\s*$/m.exec(output)?.[1];
  const pattern = /^\s*Pattern:\s+(.+?)\s*$/m.exec(output)?.[1];
  return path && pattern ? { path, pattern } : undefined;
}

export interface IndexState {
  /** Absolute repo root. */
  root: string;
  /** What qmd has registered per collection name; absent when not registered. */
  registered: Record<string, Registered | undefined>;
  /** Whether an absolute path exists (to tell a moved checkout from another live one). */
  exists: (path: string) => boolean;
  /** Subfolders present per collection dir (relative names), for path contexts. */
  subfolders: (dir: string) => string[];
  /** Re-point collections registered at another existing checkout. */
  force: boolean;
}

export interface IndexPlan {
  /** qmd argument lists, in order. */
  commands: string[][];
  /** Things the user should know, such as a collection left alone. */
  notes: string[];
}

function absolute(root: string, dir: string): string {
  return dir === "." ? root : `${root}/${dir}`;
}

/** The qmd commands that register or update Toucan's collections, then re-index and embed. */
export function planIndex(state: IndexState): IndexPlan {
  const commands: string[][] = [];
  const notes: string[] = [];
  for (const { name, dir, mask, contexts } of DOCS_COLLECTIONS) {
    const path = absolute(state.root, dir);
    const current = state.registered[name];
    const add = ["collection", "add", path, "--name", name, "--mask", mask];
    if (!current) {
      commands.push(add);
    } else if (current.path !== path && state.exists(current.path) && !state.force) {
      notes.push(
        `${name} points at ${current.path}, another checkout that still exists; left alone (rerun with --force to point it here).`,
      );
      continue;
    } else if (current.path !== path || current.pattern !== mask) {
      // qmd can't change a collection's path or mask in place.
      commands.push(["collection", "remove", name], add);
    }
    const present = new Set(state.subfolders(dir));
    for (const [sub, text] of Object.entries(contexts)) {
      if (sub === "" || present.has(sub)) {
        commands.push(["context", "add", `qmd://${name}/${sub}`, text]);
      }
    }
    for (const sub of present) {
      if (!(sub in contexts)) {
        notes.push(
          `${dir}/${sub} has no context yet: add one to DOCS_COLLECTIONS in scripts/qmd-docs.mts.`,
        );
      }
    }
  }
  commands.push(["update"], ["embed"]);
  return { commands, notes };
}

/** Whether an edited file is in one of Toucan's collections, so keyword search needs a refresh. */
export function isIndexedDoc(file: string, root: string): boolean {
  // A file outside the repo comes out as "../…", which no collection mask matches.
  const path = relative(root, file);
  return DOCS_COLLECTIONS.some(({ dir, mask }) =>
    matchesGlob(path, dir === "." ? mask : `${dir}/${mask}`),
  );
}
