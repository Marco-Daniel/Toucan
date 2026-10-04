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
  it("puts the Install button before the menu, which sits at the far right", () => {
    const install = html.indexOf(">Install</a>");
    const menu = html.indexOf("<details");
    expect(install).toBeGreaterThan(0);
    expect(menu).toBeGreaterThan(install);
    expect(html.slice(html.lastIndexOf("</details>"))).not.toContain("<a");
  });

  it("makes the menu toggle a 44 px icon button named Menu that says it's closed", () => {
    expect(html).toMatch(
      /<summary class="flex size-11 [^"]*" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24" class="size-6" fill="currentColor" aria-hidden="true">(<rect [^>]*><\/rect>){3}<\/svg><\/summary>/,
    );
  });
});
