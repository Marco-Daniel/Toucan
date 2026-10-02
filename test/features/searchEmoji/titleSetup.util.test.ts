import { describe, expect, it } from "vitest";
import { TitleSetup } from "../../../src/features/searchEmoji/titleSetup.util.ts";
import {
  PENDING_STALE_MS,
  type TitleChange,
} from "../../../src/features/searchEmoji/windowTitle.util.ts";

const DEFAULT = "${activeEditorShort}${separator}${rootName}";
const MINE = "${rootName} — ${activeEditorShort}";

/**
 * A fake VS Code: settings, globalState and the consent dialog. `calls` logs
 * every write in order, each with the record as it was at that moment.
 */
function create(
  state: {
    enabled?: boolean;
    focused?: boolean;
    title?: string;
    overridden?: boolean;
    change?: TitleChange;
    answer?: boolean;
    failTitle?: boolean;
    /** Runs while the dialog is open. */
    duringDialog?: (world: { title: string | undefined }) => void;
    /** Keeps the dialog open until this settles. */
    dialog?: Promise<boolean>;
  } = {},
) {
  const world = {
    enabled: state.enabled ?? true,
    title: state.title,
    change: state.change,
    calls: [] as string[],
    asked: [] as boolean[],
    warnings: [] as string[],
    now: 1_000_000,
  };
  const title = new TitleSetup({
    enabled: () => world.enabled,
    focused: () => state.focused ?? true,
    now: () => world.now,
    title: () => ({ global: world.title, default: DEFAULT, overridden: state.overridden ?? false }),
    readChange: () => world.change,
    writeChange: async (change) => {
      world.calls.push(`record ${JSON.stringify(change)}`);
      world.change = change;
    },
    writeTitle: async (value) => {
      world.calls.push(`title ${String(value)}`);
      if (state.failTitle) {
        throw new Error("settings.json is read-only");
      }
      world.title = value;
    },
    disable: async () => {
      world.calls.push("disable");
      world.enabled = false;
    },
    ask: async (overridden) => {
      world.asked.push(overridden);
      state.duringDialog?.(world);
      return state.dialog ?? state.answer ?? true;
    },
    info: () => {},
    failed: (error) => world.warnings.push(String(error)),
  });
  return { title, world };
}

describe("TitleSetup, consent", () => {
  it("records the change as pending, writes the title, then settles the record", async () => {
    const { title, world } = create({ title: MINE });
    const change = await title.settle();
    expect(world.calls).toEqual([
      `record {"previous":"${MINE}","written":"\${activeRepositoryName}${MINE}","pendingSince":1000000}`,
      `title \${activeRepositoryName}${MINE}`,
      `record {"previous":"${MINE}","written":"\${activeRepositoryName}${MINE}"}`,
    ]);
    expect(change).toEqual({ previous: MINE, written: `\${activeRepositoryName}${MINE}` });
    expect(world.asked).toEqual([false]);
  });

  it("builds on VS Code's default title when the user has none", async () => {
    const { title, world } = create();
    await title.settle();
    expect(world.title).toBe(`\${activeRepositoryName}${DEFAULT}`);
    expect(world.change).toEqual({ previous: undefined, written: world.title });
  });

  it("turns the feature off and changes nothing when the user declines", async () => {
    const { title, world } = create({ title: MINE, answer: false });
    expect(await title.settle()).toBeUndefined();
    expect(world.calls).toEqual(["disable"]);
    expect(world.title).toBe(MINE);
  });

  it("clears the record again when the title write fails, and tells the user", async () => {
    const { title, world } = create({ title: MINE, failTitle: true });
    expect(await title.settle()).toBeUndefined();
    expect(world.calls.at(-1)).toBe("record undefined");
    expect(world.warnings).toEqual(["Error: settings.json is read-only"]);
  });

  it("records without asking when the title already has the variable", async () => {
    const own = `\${activeRepositoryName} · ${MINE}`;
    const { title, world } = create({ title: own });
    expect(await title.settle()).toEqual({ previous: own, written: undefined });
    expect(world.asked).toEqual([]);
    expect(world.calls).toEqual([`record {"previous":"${own}"}`]);
  });

  it("uses the title as it is after the dialog, not before", async () => {
    const { title, world } = create({
      title: MINE,
      duringDialog: (w) => {
        w.title = "${rootName}"; // changed by another window or Settings Sync
      },
    });
    await title.settle();
    expect(world.change).toEqual({
      previous: "${rootName}",
      written: "${activeRepositoryName}${rootName}",
    });
  });

  it("says in the dialog when this workspace overrides window.title", async () => {
    const { title, world } = create({ title: MINE, overridden: true });
    await title.settle();
    expect(world.asked).toEqual([true]);
  });

  it("asks only once while the dialog is open", async () => {
    let release!: (answer: boolean) => void;
    const dialog = new Promise<boolean>((resolve) => (release = resolve));
    const { title, world } = create({ title: MINE, dialog });
    const first = title.settle();
    const second = title.settle();
    release(true);
    await Promise.all([first, second]);
    expect(world.asked).toEqual([false]);
  });

  it("does nothing global in an unfocused window", async () => {
    const { title, world } = create({ title: MINE, focused: false });
    expect(await title.settle()).toBeUndefined();
    expect(world.calls).toEqual([]);
  });
});

describe("TitleSetup, restore", () => {
  const written = `\${activeRepositoryName}${MINE}`;

  it("restores the previous title and forgets the change", async () => {
    const { title, world } = create({
      enabled: false,
      title: written,
      change: { previous: MINE, written },
    });
    expect(await title.settle()).toBeUndefined();
    expect(world.calls).toEqual([`title ${MINE}`, "record undefined"]);
  });

  it("keeps a title the user edited since, and forgets the change", async () => {
    const { title, world } = create({
      enabled: false,
      title: "edited",
      change: { previous: MINE, written },
    });
    await title.settle();
    expect(world.calls).toEqual(["record undefined"]);
    expect(world.title).toBe("edited");
  });
});

describe("TitleSetup, crash recovery", () => {
  const written = `\${activeRepositoryName}${MINE}`;

  it("drops a stale pending record whose write never happened, then asks again", async () => {
    const { title, world } = create({
      title: MINE,
      change: { previous: MINE, written, pendingSince: 1_000_000 - PENDING_STALE_MS - 1 },
    });
    await title.settle();
    expect(world.calls[0]).toBe("record undefined");
    expect(world.asked).toEqual([false]);
    expect(world.change).toEqual({ previous: MINE, written });
  });

  it("leaves a stale pending record alone in an unfocused window", async () => {
    const change = { previous: MINE, written, pendingSince: 0 };
    const { title, world } = create({ title: MINE, focused: false, change });
    expect(await title.settle()).toEqual(change);
    expect(world.calls).toEqual([]);
  });
});
