// import utils
import { pageMeta } from "../lib/meta.util.ts";
import { buildReleases } from "../lib/releases.server.ts";

// import views
import { Features } from "../components/features.view.tsx";
import { GlyphShowcase } from "../components/glyphShowcase.view.tsx";
import { Hero } from "../components/hero.view.tsx";
import { Install } from "../components/install.view.tsx";
import { Palette } from "../components/palette.view.tsx";
import { Section } from "../components/section.view.tsx";

// import consts
import { screenshotUrl } from "../lib/brand.assets.ts";
import { GLYPHS } from "@toucan/brand/glyphs.consts.ts";
import { BRAND_PRESETS } from "@toucan/brand/presets.consts.ts";
import { RELEASES_URL } from "../lib/site.consts.ts";

// import types
import type { Route } from "./+types/home";

export async function loader() {
  const [latest] = await buildReleases();
  return latest === undefined
    ? { version: undefined, releaseUrl: RELEASES_URL }
    : { version: latest.tag.replace(/^v/, ""), releaseUrl: latest.url };
}

export function meta() {
  return pageMeta({
    title: "Toucan",
    description:
      "A VS Code extension that gives every repository its own color: the Command Center, a status bar glyph and an optional sidebar block.",
    path: "/",
  });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { version, releaseUrl } = loaderData;
  return (
    <div>
      <Hero />
      <Section
        title="Three windows, three colors."
        lead="Open your repos side by side and tell them apart at a glance. The Command Center follows the focused window; the status bar always shows each window's own color."
      >
        <img
          src={screenshotUrl("hero.gif")}
          alt="Three VS Code windows, each with its own Toucan color and glyph"
          className="block w-full rounded-[14px] border-2 border-ink bg-code shadow-[8px_8px_0_var(--color-amber)]"
        />
      </Section>
      <Section
        id="features"
        isFlush
        title="What Toucan colors"
        lead="Pick a color once per repo. Toucan stores it in your settings and repaints every window that opens it."
      >
        <Features />
      </Section>
      <Section
        id="glyphs"
        tone="dark"
        title={`${GLYPHS.length} glyphs, drawn for 16 pixels.`}
        lead="Every glyph is drawn in Toucan's own font, sized for the status bar and readable on dark and light themes."
      >
        <GlyphShowcase />
      </Section>
      <Section
        title="A palette from the toucan."
        lead={`${BRAND_PRESETS.length} presets taken from the bird's beak, plumage and jungle. Or type any CSS color.`}
      >
        <Palette />
      </Section>
      <Section
        id="install"
        tone="cream"
        title="Install"
        lead="Install Toucan from the Visual Studio Marketplace, or from a GitHub release. Then run Toucan: Set Color for This Repo from the Command Palette."
      >
        {version === undefined ? (
          <p>
            See the <a href={releaseUrl}>releases page</a>.
          </p>
        ) : (
          <Install version={version} releaseUrl={releaseUrl} />
        )}
      </Section>
    </div>
  );
}
