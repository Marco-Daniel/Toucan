// The social media card's SVG (website/0011): assets/og-card.svg, with its
// text outlined from Inter so it renders the same everywhere, gets the brand's
// colors filled in and the icon's sunset scene placed on the right.
// import utils
import { heroScene } from "../app/lib/svg.util.ts";

/** Where the scene goes in the card template. */
const SCENE_SLOT = '<g data-scene=""/>';
/** The scene's place on the 1200×630 card: x, y and size. */
const SCENE = { x: 650, y: 40, size: 520 } as const;

interface OgCardSvgArgs {
  /** assets/og-card.svg: `{name}` tokens for the brand's colors and the scene slot. */
  template: string;
  /** The brand's icon.svg. */
  iconSvg: string;
  colors: Readonly<Record<string, string>>;
}

/** The card as one SVG document. Throws on a color token the brand doesn't have, or a missing scene slot. */
export function ogCardSvg({ template, iconSvg, colors }: OgCardSvgArgs): string {
  if (!template.includes(SCENE_SLOT)) {
    throw new Error("The card template has no scene slot");
  }
  const scene = heroScene(iconSvg)
    .trim()
    .replace(
      /^<svg\b[^>]*>/,
      `<svg x="${SCENE.x}" y="${SCENE.y}" width="${SCENE.size}" height="${SCENE.size}" viewBox="0 0 128 128">`,
    );
  return template.replace(SCENE_SLOT, scene).replaceAll(/\{(\w+)\}/g, (_token, name: string) => {
    const color = colors[name];
    if (color === undefined) {
      throw new Error(`The card template uses an unknown brand color: ${name}`);
    }
    return color;
  });
}
