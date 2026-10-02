import { describe, expect, it } from "vitest";
import { agentsControlAction } from "../../../src/features/agentsControl/agentsControl.util.ts";
import type { AgentsControlState } from "../../../src/features/agentsControl/agentsControl.util.ts";

const base: AgentsControlState = {
  registered: true,
  effective: "compact",
  workspaceDecides: false,
  declined: false,
};

describe("agentsControlAction", () => {
  it("offers when compact is in effect from user settings or the default", () => {
    expect(agentsControlAction(base)).toBe("offer");
  });

  it("only logs after the user declined", () => {
    expect(agentsControlAction({ ...base, declined: true })).toBe("log");
  });

  it.each(["badge", "hidden", undefined])("does nothing when the value is %s", (effective) => {
    expect(agentsControlAction({ ...base, effective })).toBe("none");
  });

  it("does nothing when the setting doesn't exist in this VS Code", () => {
    expect(agentsControlAction({ ...base, registered: false })).toBe("none");
  });

  it("does nothing when a workspace value decides it", () => {
    expect(agentsControlAction({ ...base, workspaceDecides: true })).toBe("none");
    expect(agentsControlAction({ ...base, workspaceDecides: true, declined: true })).toBe("none");
  });
});
