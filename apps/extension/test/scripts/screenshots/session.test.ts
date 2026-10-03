// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { baseSettings } from "../../../scripts/screenshots/session.mts";

describe("baseSettings", () => {
  it("gives the demo profile the repo colors and keeps everything personal or noisy off", () => {
    expect(baseSettings()).toEqual({
      "toucan.repos": {
        webshop: { background: "#e8579b", glyph: "heart" },
        "payments-api": { background: "#14939c", glyph: "rocket" },
        "docs-site": { background: "#faa404", glyph: "leaf" },
      },
      "workbench.colorTheme": "Default Dark Modern",
      "window.dialogStyle": "custom",
      "window.restoreWindows": "none",
      "workbench.startupEditor": "none",
      "workbench.tips.enabled": false,
      "workbench.secondarySideBar.defaultVisibility": "hidden",
      "security.workspace.trust.enabled": false,
      "chat.disableAIFeatures": true,
      "chat.agentsControl.enabled": "badge",
      "git.enabled": false,
      "breadcrumbs.enabled": false,
      "editor.minimap.enabled": false,
      "editor.lightbulb.enabled": "off",
      "typescript.validate.enable": false,
      "javascript.validate.enable": false,
      "problems.decorations.enabled": false,
      "update.mode": "none",
      "telemetry.telemetryLevel": "off",
      "extensions.autoUpdate": false,
      "extensions.autoCheckUpdates": false,
      "extensions.ignoreRecommendations": true,
    });
  });
});
