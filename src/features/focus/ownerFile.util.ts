// import libraries
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// import utils
import { isRecord } from "../../shared/records/records.util.ts";
import { tryCatch } from "../../shared/async/tryCatch.util.ts";
import { writeAtomically } from "../../shared/fs/atomicWrite.util.ts";

// import types
import type { FocusPorts } from "./focus.util.ts";

interface CreateOwnerFileArgs {
  directory: string;
  /** This window's id. */
  id: string;
}

/**
 * The owner file shared by all local windows: which window last took focus
 * (toucan-v1/0002). `id` names this window's temp file, so two windows writing at once
 * never share one.
 */
export function createOwnerFile({
  directory,
  id,
}: CreateOwnerFileArgs): Pick<FocusPorts, "readOwner" | "writeOwner"> {
  const file = join(directory, "owner.json");
  return {
    async readOwner() {
      const [parsed, error] = await tryCatch(() =>
        readFile(file, "utf8").then((text): unknown => JSON.parse(text)),
      );
      if (error !== null) {
        // Missing or unreadable counts as another window's, so nothing is cleared.
        return undefined;
      }
      const owner = isRecord(parsed) ? parsed["window"] : undefined;
      return typeof owner === "string" ? owner : undefined;
    },
    async writeOwner(owner) {
      await mkdir(directory, { recursive: true });
      await writeAtomically({
        file,
        temporary: join(directory, `owner.${id}.tmp`),
        text: JSON.stringify({ window: owner }),
      });
    },
  };
}
