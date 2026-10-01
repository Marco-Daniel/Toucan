# 0014. Ship a toucan-themed preset palette

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

The *Pick Preset Color* command needs a fixed set of colors to choose from. The palette was left open in the first plan.

## Considered Options

- **Toucan-themed colors** named after the bird and its habitat
- Plain color names (red, orange, amber, …)
- Both, as two groups in the quick pick

## Decision Outcome

Chosen: **a toucan-themed palette of 16 named colors**, taken from published toucan palettes (sources below). The names are Toucan's own. Most hex values are the sources' exact values; four were adjusted so neighbouring presets are easier to tell apart, and four more were added as lighter or darker versions of source colors to fill gaps in the range (all marked below).

| Name | Hex | Source |
|---|---|---|
| Beak Red | `#f92824` | SchemeColor "Toucan" (Tangy Red) |
| Berry Red | `#a3161a` | Added: SchemeColor "Toucan" Tangy Red `#f92824`, darkened |
| Beak Orange | `#e0620b` | SchemeColor "Toucan" (Shiny Orange `#ff8b1a`, darkened to stand apart from Bill Amber) |
| Bill Amber | `#faa404` | ColorsWall 47017 (Orange) |
| Beak Yellow | `#fde246` | SchemeColor "Toucan" (Shiny Gold) |
| Bill Lime | `#8a9c05` | SchemeColor "Lone Toucan" (Rio Grande `#b3c806`, darkened to stand apart from Beak Yellow) |
| Jungle Green | `#56915e` | ColorsWall 7132 (Sea green) |
| Canopy Teal | `#14939c` | ColorsWall 47017 (Teal `#046c74`, lightened to stand apart from Slate Blue) |
| Slate Blue | `#2c4a51` | ColorsWall 7132 (Dark slate grey shade; replaces ColorsWall 47017's `#345464` as a slightly darker slate) |
| Orchid Purple | `#6241bd` | SchemeColor "Toucan" (Lover) |
| Lilac | `#b59ae0` | Added: SchemeColor "Toucan" Lover `#6241bd`, lightened |
| Plum | `#70486c` | SchemeColor "Lone Toucan" (Purple Angel) |
| Tropical Pink | `#e8579b` | ColorsWall 7132 (Deep pink) |
| Blossom Pink | `#f5a3c7` | Added: ColorsWall 7132 Deep pink `#e8579b`, lightened |
| Silver | `#a7a8b3` | Added: ColorsWall 47017 Grey `#787884`, lightened |
| Plumage Black | `#101316` | SchemeColor "Toucan" (Business Black) |

Sources:
- [SchemeColor: Toucan](https://www.schemecolor.com/toucan.php)
- [SchemeColor: Lone Toucan](https://www.schemecolor.com/lone-toucan.php)
- [ColorsWall: Toucan tropical graphic design colors (7132)](https://colorswall.com/palette/7132)
- [ColorsWall: Toucan design vector bird colours (47017)](https://colorswall.com/palette/47017)

The quick pick shows each preset with its swatch and name and previews it live, like *Set Color*. A picked preset is stored as its hex value, so later palette changes never change a repo's color.

## Consequences

- Good: fits the extension's name and gives a quick, well-spread starting set.
- Bad: no neutral "plain" names; anyone wanting another color uses *Set Color*.
- Bad: the darkest presets (Plumage Black, Slate Blue, Plum, Orchid Purple) and the lightest (Beak Yellow, Bill Amber) are hard to see as a status bar glyph on a dark or light theme respectively. This is the existing status bar contrast risk in plan.md. The Command Center is fine, because its foreground is derived for contrast.
