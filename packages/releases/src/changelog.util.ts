// A CHANGELOG.md made from the releases' notes (ADR-0013): each version's
// "what's new", the part of its notes before the install steps. The full
// notes, with the install steps and the SHA-256, stay on the GitHub release.
// import types
import type { Release } from "./releases.util.ts";

/** An ISO 8601 timestamp's date part, YYYY-MM-DD. */
const DATE_LENGTH = 10;

/** Where the notes' install steps start; what comes before it is what's new. */
const INSTALL_HEADING = /^## Install\b/m;

/** The part of release notes before their install steps: what's new, for users. */
export function whatsNew(notes: string): string {
  const install = INSTALL_HEADING.exec(notes);
  return (install === null ? notes : notes.slice(0, install.index)).trim();
}

/** Markdown with every heading one level down, so a release's own sections sit under its version. */
function demoted(markdown: string): string {
  return markdown.replaceAll(/^(#{1,5}) /gm, "#$1 ");
}

/** A version that isn't published yet, with its notes from the repo. */
export interface UpcomingRelease {
  /** Without the `v`, as in package.json. */
  version: string;
  notes: string;
}

interface ChangelogMarkdownArgs {
  /** The published releases, newest first. */
  releases: readonly Release[];
  /** The version being packaged, shown first. */
  upcoming?: UpcomingRelease | undefined;
}

/** The changelog: the upcoming version first, then every published release, newest first. */
export function changelogMarkdown({ releases, upcoming }: ChangelogMarkdownArgs): string {
  if (upcoming !== undefined && releases.some(({ tag }) => tag === `v${upcoming.version}`)) {
    throw new Error(`v${upcoming.version} is already released`);
  }
  const sections = [
    ...(upcoming === undefined
      ? []
      : [`## ${upcoming.version}\n\n${demoted(whatsNew(upcoming.notes))}`]),
    ...releases.map(
      ({ tag, publishedAt, url, body }) =>
        `## [${tag.replace(/^v/, "")}](${url}) (${publishedAt.slice(0, DATE_LENGTH)})\n\n${demoted(whatsNew(body))}`,
    ),
  ];
  return `# Changelog

Toucan's releases, newest first. Each one's full notes, with the install steps and the VSIX's SHA-256, are on its GitHub release.

${sections.join("\n\n")}
`;
}
