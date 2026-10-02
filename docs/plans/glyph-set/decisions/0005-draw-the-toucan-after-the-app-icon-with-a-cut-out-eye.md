# 0005. Draw the toucan after the app icon, with a cut-out eye

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

The toucan glyph should be recognizably the extension icon's toucan ("use our icon for the app as a base"), but the icon's silhouette relies on color bands in the beak and on fine detail that disappears at 16px in one color.

## Considered Options

- **The scaled app-icon silhouette**: too thin; the beak turns into a line.
- **The thickened silhouette**: the detail is lost, and it reads as a blob.
- **Head only, no eye**: reads as a fish.
- **Head and beak with a notch between them, plus a cut-out eye, 18 wide**.

## Decision Outcome

Chosen: **head and beak with a notch and a cut-out eye, 18 units wide**, because it was the only version that read as a toucan at 16px (see `assets/toucan-tries.png`). The notch separates the beak from the head, and the eye hole makes it a bird. The extra width gives the beak room.

## Consequences

- Good: a recognizable mascot glyph that matches the app icon.
- Bad: 18 wide instead of 16, so the label shifts slightly; the eye needs the lighter hole softening to stay open.
