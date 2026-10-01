// Loads the built bundle in plain Node with a stub for `vscode`, so a
// dependency the bundler left unresolved fails CI instead of activation.
import Module, { createRequire } from "node:module";

type Load = (this: unknown, request: string, ...rest: unknown[]) => unknown;
// `_load` is Node's internal hook that every require() goes through; it isn't typed.
const internals = Module as unknown as { _load: Load };

// oxlint-disable no-underscore-dangle -- Module._load is the hook require() goes through.
const load = internals._load;
internals._load = function (request, ...rest) {
  return request === "vscode" ? {} : load.call(this, request, ...rest);
};
// oxlint-enable no-underscore-dangle

const extension = createRequire(import.meta.url)("../dist/extension.cjs") as Record<
  string,
  unknown
>;
for (const name of ["activate", "deactivate"]) {
  if (typeof extension[name] !== "function") {
    throw new Error(`dist/extension.cjs doesn't export ${name}`);
  }
}
console.log("dist/extension.cjs loads with only vscode external");
