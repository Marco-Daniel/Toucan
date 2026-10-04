// import libraries
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

// import views
import { SiteNav } from "../../app/components/siteNav.view.tsx";

const html = renderToStaticMarkup(
  <MemoryRouter>
    <SiteNav />
  </MemoryRouter>,
);

describe("the site nav on phones", () => {
  it("runs logo, desktop links, Install, then the menu as the row's last item", () => {
    const row =
      /<div class="mx-auto flex h-16[^"]*">([\s\S]*?)<\/div><div class="beak-band/.exec(
        html,
      )?.[1] ?? "";
    const markers = [">Toucan</a>", '<div class="ml-auto hidden', ">Install</a>", "<details"];
    expect(
      markers
        .map((marker) => row.indexOf(marker))
        .every((at, index, all) => at >= 0 && (index === 0 || at > (all[index - 1] ?? 0))),
    ).toBe(true);
    expect(markers.toSorted((a, b) => row.indexOf(a) - row.indexOf(b))).toEqual(markers);
    expect(row.endsWith("</details>")).toBe(true);
  });

  it("makes the menu toggle a 44 px icon button named Menu, its state left to <summary>", () => {
    expect(html).toMatch(
      /<summary class="flex size-11 [^"]*" aria-label="Menu"><svg viewBox="0 0 24 24" class="size-6" fill="currentColor" aria-hidden="true">(<rect [^>]*><\/rect>){3}<\/svg><\/summary>/,
    );
    expect(html).not.toContain("aria-expanded");
  });
});
