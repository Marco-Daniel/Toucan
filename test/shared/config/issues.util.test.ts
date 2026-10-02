import { describe, expect, it } from "vitest";
import { IssueReporter } from "../../../src/shared/config/issues.util.ts";

function setup() {
  const lines: string[] = [];
  const reporter = new IssueReporter({
    log: {
      info: (message) => lines.push(`info ${message}`),
      warn: (message) => lines.push(`warn ${message}`),
    },
    setting: "toucan.repos",
  });
  return { lines, reporter };
}

describe("IssueReporter", () => {
  it("logs nothing for a clean config at startup", () => {
    const { lines, reporter } = setup();
    reporter.report([]);
    expect(lines).toEqual([]);
  });

  it("logs each issue once until the issues change", () => {
    const { lines, reporter } = setup();
    const issues = [{ repo: "a", message: "bad" }, { message: "malformed" }];
    reporter.report(issues);
    reporter.report([...issues]);
    expect(lines).toEqual(["warn toucan.repos › a: bad", "warn malformed"]);
  });

  it("logs again when the issues change, and once when they're fixed", () => {
    const { lines, reporter } = setup();
    reporter.report([{ repo: "a", message: "bad" }]);
    reporter.report([{ repo: "b", message: "bad" }]);
    reporter.report([]);
    reporter.report([]);
    expect(lines).toEqual([
      "warn toucan.repos › a: bad",
      "warn toucan.repos › b: bad",
      "info toucan.repos has no problems.",
    ]);
  });
});
