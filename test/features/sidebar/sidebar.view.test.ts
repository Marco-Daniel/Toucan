import { describe, expect, it } from "vitest";
import { deriveColors } from "../../../src/shared/color/derive.util.ts";
import type { Hex } from "../../../src/shared/model/model.types.ts";
import { sidebarBlockHtml } from "../../../src/features/sidebar/sidebar.view.ts";

const colors = deriveColors("#14939c" as Hex);

describe("sidebarBlockHtml", () => {
  it("allows no scripts and only inline styles", () => {
    const html = sidebarBlockHtml({ name: "toucan", glyph: "heart", colors, style: "full" });
    expect(html).toContain(`content="default-src 'none'; style-src 'unsafe-inline';"`);
    expect(html).not.toMatch(/<script|\son\w+=/i);
  });

  it("paints the full style solid with the derived foreground", () => {
    const html = sidebarBlockHtml({ name: "toucan", glyph: "square", colors, style: "full" });
    expect(html).not.toContain("var(--vscode-foreground)");
    expect(html).toContain("background: #14939c;");
    expect(html).toContain(`color: ${colors.foreground};`);
    expect(html).toContain(`fill="${colors.foreground}"`);
  });

  it("paints the muted style faint with glyph and name in the repo color", () => {
    const html = sidebarBlockHtml({ name: "toucan", glyph: "square", colors, style: "muted" });
    expect(html).toContain("background: #14939c40;");
    expect(html).toContain("color: #14939c;");
    // The name uses the theme's text color: the repo color on its own tint is too faint.
    expect(html).toContain("color: var(--vscode-foreground);");
    expect(html).toContain('fill="#14939c"');
  });

  it("escapes the repo name", () => {
    const html = sidebarBlockHtml({
      name: `<img src=x onerror="alert(1)">&'`,
      glyph: "square",
      colors,
      style: "full",
    });
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;");
    expect(html).not.toContain("<img");
  });

  it("uses an opaque foreground even when an override is translucent", () => {
    const translucent = { ...colors, foreground: "#ffffff80" as Hex };
    const html = sidebarBlockHtml({ name: "x", glyph: "bar", colors: translucent, style: "full" });
    expect(html).toContain("color: #ffffff;");
  });
});
