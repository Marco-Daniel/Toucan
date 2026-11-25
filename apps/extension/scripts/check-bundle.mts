// Loads the built bundle in plain Node with a stub for `vscode`, so a
// dependency the bundler left unresolved fails CI instead of activation.
// import libraries
import Module, { createRequire } from "node:module";

// import utils
import { isRecord } from "../src/shared/records/records.util.ts";

// `_load` is Node's internal hook that every require() goes through. It isn't
// typed, so check that it's there before taking it over.
// oxlint-disable no-underscore-dangle -- Module._load is the hook require() goes through.
if (!("_load" in Module) || typeof Module._load !== "function") {
  throw new Error("node:module has no _load function to hook: this check needs a new way in");
}
const load = Module._load;
Module._load = function (this: unknown, request: unknown, ...rest: unknown[]): unknown {
  const loaded: unknown = request === "vscode" ? {} : load.call(this, request, ...rest);
  return loaded;
};
// oxlint-enable no-underscore-dangle

const extension: unknown = createRequire(import.meta.url)("../dist/extension.cjs");
for (const name of ["activate", "deactivate"]) {
  if (!isRecord(extension) || typeof extension[name] !== "function") {
    throw new Error(`dist/extension.cjs doesn't export ${name}`);
  }
}
console.log("dist/extension.cjs loads with only vscode external");
