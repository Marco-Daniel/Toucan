// Loads the built bundle in plain Node with a stub for `vscode`, so a
// dependency the bundler left unresolved fails CI instead of activation.
import Module, { createRequire } from "node:module";
import { isRecord } from "../src/shared/records/records.util.ts";

type Load = (this: unknown, request: string, ...rest: unknown[]) => unknown;
// `_load` is Node's internal hook that every require() goes through; it isn't typed.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- an untyped Node internal; the check fails loudly if it's gone
const internals = Module as unknown as { _load: Load };

// oxlint-disable no-underscore-dangle -- Module._load is the hook require() goes through.
const load = internals._load;
internals._load = function (request, ...rest) {
  return request === "vscode" ? {} : load.call(this, request, ...rest);
};
// oxlint-enable no-underscore-dangle

const extension: unknown = createRequire(import.meta.url)("../dist/extension.cjs");
for (const name of ["activate", "deactivate"]) {
  if (!isRecord(extension) || typeof extension[name] !== "function") {
    throw new Error(`dist/extension.cjs doesn't export ${name}`);
  }
}
console.log("dist/extension.cjs loads with only vscode external");
