// A release's notes (ADR-0013), written in its bump PR as release-notes.md,
// with the VSIX's SHA-256 left as a placeholder until the packaging workflow
// has built it. Pure, so the checks are tested; fill-release-notes.mts and
// changelog.mts use them.

/** Stands where the VSIX's SHA-256 goes; the packaging workflow fills it in. */
export const SHA256_PLACEHOLDER = "{{sha256}}";
/** The notes' checksum line, as publish.yml looks for it once it's filled in. */
const SHA256_LINE = `SHA-256: \`${SHA256_PLACEHOLDER}\``;

interface ReleaseNotesProblemsArgs {
  notes: string;
  /** The version being packaged, from package.json. */
  version: string;
}

/** What keeps the notes from being this version's, one line each; empty when they are. */
export function releaseNotesProblems({ notes, version }: ReleaseNotesProblemsArgs): string[] {
  const placeholders = notes.split(SHA256_PLACEHOLDER).length - 1;
  return [
    ...(notes.includes(`toucan-${version}.vsix`)
      ? []
      : [`they don't name toucan-${version}.vsix, the VSIX of version ${version}`]),
    ...(/^## Install\b/m.test(notes) ? [] : ["they have no ## Install section"]),
    ...(placeholders === 1
      ? []
      : [`they have ${placeholders} ${SHA256_PLACEHOLDER} placeholders, not 1`]),
    // publish.yml finds the checksum by this exact line.
    ...(notes.includes(SHA256_LINE) ? [] : [`they have no line ${SHA256_LINE}`]),
  ];
}

interface FilledReleaseNotesArgs {
  notes: string;
  /** The VSIX's SHA-256, lower-case hex. */
  sha256: string;
}

/** The notes with the VSIX's SHA-256 in place of the placeholder. */
export function filledReleaseNotes({ notes, sha256 }: FilledReleaseNotesArgs): string {
  if (!/^[0-9a-f]{64}$/.test(sha256)) {
    throw new Error(`Not a SHA-256: ${JSON.stringify(sha256)}`);
  }
  return notes.replace(SHA256_PLACEHOLDER, sha256);
}
