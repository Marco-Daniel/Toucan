# Thinking trail: Toucan glyph set

## Starting framing

After the logo and the extension icon landed, Marco wanted "some more icons for media/icons … at least a toucan, an alien, a heart, a star", and then "maybe a lightning bolt". The assumptions: the new glyphs sit next to the existing eight (three of Toucan's own plus five codicons), the toucan is based on the app icon, and a contact sheet would show them all at status bar size.

## Turns

**From additions to a redraw.** The plan was to add a handful of own glyphs next to the codicons. The brainstorm made it clear the glyph has two jobs equally (telling repos apart and personality), and mixing two drawing styles would show at 16px. So the whole set is redrawn in Toucan's own font. → 0001

**From about 12 to 16, in groups.** The recommended size was about 12. Marco pushed to 16, which made four groups of four the natural order. That also gave a reason to drop the two codicons that fit no group. → 0002, 0003

**Sharp to softened.** The first sheet used sharp polygons like the logo. Marco: "make them a bit rounder, keep the polygonal style, but a bit more smooth". A round join on every corner did it, but filled in the eyes and windows, so holes got a lighter softening of their own. → 0004

**The toucan took several tries.** A scaled app-icon silhouette was too thin, and a thickened one lost its shape. Head only read as a fish. A notch between head and beak plus a cut-out eye made it a toucan. → 0005

**The sun went from color to spikes to pins.** The first sun blended into its surroundings at small size, and Marco asked for Beak Orange on the sheet. Then came the "spiky sun" request, then separate rays (no merging into a ring), then no twisting for separate rays, then pointier. The pick was sun-pins-8. → 0006

## Rejected without a decision file

- **flame, paw, crown, gem**: drawn on the candidate sheet, but they didn't make the 16. The groups were full with stronger picks.
- **sun-curl-7 as a second sun**: liked, but two suns in one set of 16 is one too many.
- **New emoji families for the new glyphs**: no emoji both matches the shape and comes in the repo colors, so squares stay the fallback (as toucan-v1 0012 already did for star).

## Open / to re-check

- Legibility on a real low-DPI screen, especially the sun's thin rays and the robot's mouth. The sheet is rendered at 2×. Marco checks in VS Code before merge.
- Whether the 18-wide toucan's label shift is noticeable next to 16-wide glyphs in the status bar.
