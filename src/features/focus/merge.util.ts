// import utils
import { isRecord } from "../../shared/records/records.util.ts";

// import consts
import { COMMAND_CENTER_KEYS } from "../../shared/model/model.consts.ts";

// import types
import type { CommandCenterColors } from "../../shared/model/model.types.ts";

const PREFIX = "commandCenter.";

export type MergeResult =
  | { changed: false }
  | {
      changed: true;
      /** The new `workbench.colorCustomizations`, or `undefined` to remove the setting. */
      value: Record<string, unknown> | undefined;
    };

/** The user's current `workbench.colorCustomizations` and this window's colors (or none). */
interface MergeArgs {
  current: unknown;
  colors: CommandCenterColors | undefined;
}

/**
 * Merges Toucan's colors into the user-level `workbench.colorCustomizations`
 * (ADR-0002). Toucan owns every top-level `commandCenter.*` key: they are replaced
 * by `colors`, or all removed when `colors` is `undefined` (toucan-v1/0008). Every other
 * key, including theme-scoped blocks such as `"[Default Dark Modern]"`, is kept.
 *
 * Reports `changed: false` when the result equals the current value, so
 * callers can skip the settings write. A current value that isn't an object
 * is left alone rather than overwritten.
 */
export function mergeCustomizations({ current, colors }: MergeArgs): MergeResult {
  if (current !== undefined && !isRecord(current)) {
    return { changed: false };
  }

  const entries = Object.entries(current ?? {});
  const kept = entries.filter(([key]) => !key.startsWith(PREFIX));
  const ours: [string, string][] = colors
    ? COMMAND_CENTER_KEYS.map((key) => [PREFIX + key, colors[key]])
    : [];

  const before = new Map(entries.filter(([key]) => key.startsWith(PREFIX)));
  const same =
    before.size === ours.length && ours.every(([key, value]) => before.get(key) === value);
  if (same) {
    return { changed: false };
  }

  const merged = [...kept, ...ours];
  return { changed: true, value: merged.length > 0 ? Object.fromEntries(merged) : undefined };
}

/**
 * The full value to write for `colors` on top of `current`: the merge when it
 * changes something, else `current` as it is. `undefined` when `current` isn't
 * an object and must be left alone.
 */
export function customizationsFor({
  current,
  colors,
}: MergeArgs): { value: Record<string, unknown> | undefined } | undefined {
  if (current !== undefined && !isRecord(current)) {
    return undefined;
  }
  const result = mergeCustomizations({ current, colors });
  return { value: result.changed ? result.value : current };
}

/** Whether the value holds any key Toucan owns, e.g. left over from a crashed window. */
export function hasToucanKeys(current: unknown): boolean {
  return isRecord(current) && Object.keys(current).some((key) => key.startsWith(PREFIX));
}
