/**
 * A settings file's text as a value, parsed independently of the code under
 * test: line comments and trailing commas are stripped crudely, then JSON.parse.
 */
export function parseSettingsForTest(text: string): unknown {
  return JSON.parse(text.replace(/\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1"));
}
