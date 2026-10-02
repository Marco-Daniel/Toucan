import {
  CHANNEL_MAX,
  isTranslucent,
  normalizeColor,
  opaque,
  parseColor,
  toHex,
} from "../color/color.util.ts";
import {
  COMMAND_CENTER_KEYS,
  DEFAULT_GLYPH,
  GLYPHS,
  RETIRED_GLYPHS,
  SIDEBAR_VISIBILITIES,
  type ColorOverrides,
  type Glyph,
  type Hex,
  type SidebarVisibility,
} from "../model/model.consts.ts";
import { isRecord } from "../records/records.util.ts";

export interface RepoConfig {
  /** Command Center background, always opaque. */
  background: Hex;
  /** User-set colors as hex; missing keys are derived. */
  overrides: ColorOverrides;
  glyph: Glyph;
  /** Per-repo override of `toucan.sidebarBlock.visibility`. */
  sidebarBlock?: SidebarVisibility;
}

export interface ConfigIssue {
  /** Folder name of the entry, absent when the whole setting is malformed. */
  repo?: string;
  message: string;
}

export interface ParsedConfig {
  repos: Map<string, RepoConfig>;
  issues: ConfigIssue[];
}

const OVERRIDE_KEYS = COMMAND_CENTER_KEYS.filter((key) => key !== "background");

/**
 * Normalizes the raw `toucan.repos` value (0001). An entry with an invalid
 * background is dropped; any other invalid field is ignored and reported.
 */
export function parseRepos(raw: unknown): ParsedConfig {
  const repos = new Map<string, RepoConfig>();
  const issues: ConfigIssue[] = [];

  if (raw === undefined || raw === null) {
    return { repos, issues };
  }
  if (!isRecord(raw)) {
    issues.push({ message: "toucan.repos must be an object keyed by folder name." });
    return { repos, issues };
  }

  for (const [repo, value] of Object.entries(raw)) {
    const report = (message: string) => issues.push({ repo, message });
    const entry = parseEntry(value, report);
    if (entry) {
      repos.set(repo, entry);
    }
  }
  return { repos, issues };
}

function parseEntry(value: unknown, report: (message: string) => void): RepoConfig | undefined {
  if (typeof value === "string") {
    const background = parseBackground(value, report);
    return background === undefined
      ? undefined
      : { background, overrides: {}, glyph: DEFAULT_GLYPH };
  }

  if (!isRecord(value)) {
    report("Expected a color string or an object with a background.");
    return undefined;
  }

  const { background: rawBackground, glyph: rawGlyph, sidebarBlock: rawSidebar, ...rest } = value;

  if (rawBackground === undefined) {
    report("Missing background color.");
    return undefined;
  }
  if (typeof rawBackground !== "string") {
    report(`background ${JSON.stringify(rawBackground)} is not a color string.`);
    return undefined;
  }
  const background = parseBackground(rawBackground, report);
  if (!background) {
    return undefined;
  }

  const entry: RepoConfig = { background, overrides: {}, glyph: DEFAULT_GLYPH };

  if (rawGlyph !== undefined) {
    if (isOneOf(GLYPHS, rawGlyph)) {
      entry.glyph = rawGlyph;
    } else if (isOneOf(RETIRED_GLYPHS, rawGlyph)) {
      report(
        `glyph ${JSON.stringify(rawGlyph)} was retired; using ${DEFAULT_GLYPH}. Pick another with Toucan: Set Glyph.`,
      );
    } else {
      report(
        `glyph ${JSON.stringify(rawGlyph)} is not one of ${GLYPHS.join(", ")}; using ${DEFAULT_GLYPH}.`,
      );
    }
  }

  if (rawSidebar !== undefined) {
    if (isOneOf(SIDEBAR_VISIBILITIES, rawSidebar)) {
      entry.sidebarBlock = rawSidebar;
    } else {
      report(
        `sidebarBlock ${JSON.stringify(rawSidebar)} is not one of ${SIDEBAR_VISIBILITIES.join(", ")}; ignored.`,
      );
    }
  }

  for (const [key, raw] of Object.entries(rest)) {
    if (!isOneOf(OVERRIDE_KEYS, key)) {
      report(`Unknown key "${key}" ignored.`);
      continue;
    }
    const color = typeof raw === "string" ? normalizeColor(raw) : undefined;
    if (color) {
      entry.overrides[key] = color;
    } else {
      report(`${key} ${JSON.stringify(raw)} is not a valid color; derived instead.`);
    }
  }

  return entry;
}

/**
 * The background must be opaque: the foreground is picked for contrast against
 * it, and the status bar glyph and sidebar block are painted with it.
 */
function parseBackground(value: string, report: (message: string) => void): Hex | undefined {
  const color = parseColor(value);
  if (!color) {
    report(`background "${value}" is not a valid color.`);
    return undefined;
  }
  if (color.alpha !== undefined && Math.round(color.alpha * CHANNEL_MAX) === 0) {
    report(`background "${value}" is fully transparent.`);
    return undefined;
  }
  if (isTranslucent(color)) {
    report(`background "${value}" is translucent; its alpha is ignored.`);
    return toHex(opaque(color));
  }
  return toHex(color);
}

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}
