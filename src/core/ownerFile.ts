import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FocusPorts } from "./focus.ts";
import { isRecord } from "./records.ts";
import { tryCatch } from "./tryCatch.ts";

/**
 * The owner file shared by all local windows: which window last took focus
 * (0002). `id` names this window's temp file, so two windows writing at once
 * never share one.
 */
export function createOwnerFile(
  directory: string,
  id: string,
): Pick<FocusPorts, "readOwner" | "writeOwner"> {
  const file = join(directory, "owner.json");
  return {
    async readOwner() {
      try {
        const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
        const owner = isRecord(parsed) ? parsed["window"] : undefined;
        return typeof owner === "string" ? owner : undefined;
      } catch {
        // Missing or unreadable counts as another window's, so nothing is cleared.
        return undefined;
      }
    },
    async writeOwner(owner) {
      await mkdir(directory, { recursive: true });
      // Write then rename, so a reader never sees a half-written file.
      const temporary = join(directory, `owner.${id}.tmp`);
      try {
        await writeFile(temporary, JSON.stringify({ window: owner }));
        await rename(temporary, file);
      } catch (error) {
        // Best effort: the temp file may not exist; the write's error is the one to report.
        await tryCatch(unlink(temporary));
        throw error;
      }
    },
  };
}
