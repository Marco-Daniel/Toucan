// import libraries
import { chmod, rename, unlink, writeFile } from "node:fs/promises";

// import utils
import { tryCatch } from "../async/tryCatch.util.ts";

interface WriteAtomicallyArgs {
  file: string;
  /** Where the text is written first: next to `file`, so the rename stays on one file system. */
  temporary: string;
  text: string;
  /** Exact permission bits for the new file; without it, the file system's default. */
  mode?: number;
}

/**
 * Writes `text` to `temporary`, then renames it over `file`, so a reader
 * never sees a half-written file. If any step fails, the temp file is
 * removed (as far as it exists) and the error is rethrown.
 */
export async function writeAtomically({
  file,
  temporary,
  text,
  mode,
}: WriteAtomicallyArgs): Promise<void> {
  const [, error] = await tryCatch(async () => {
    if (mode === undefined) {
      await writeFile(temporary, text);
    } else {
      // Created with `mode`, so the copy is never more readable than the original;
      // the umask can narrow it, so chmod then sets it exactly.
      await writeFile(temporary, text, { mode });
      await chmod(temporary, mode);
    }
    await rename(temporary, file);
  });
  if (error !== null) {
    await tryCatch(() => unlink(temporary));
    throw error;
  }
}
