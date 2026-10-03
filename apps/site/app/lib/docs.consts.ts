/** A docs page: its URL slug (content/docs/<slug>.md), its title and its one-line summary. */
export interface DocsPage {
  slug: string;
  title: string;
  description: string;
}

/** The docs pages in sidebar order (website/0003); the first is /docs itself. */
export const DOCS_PAGES: readonly DocsPage[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    description: "Install Toucan and give your first repository a color.",
  },
  {
    slug: "colors",
    title: "Colors",
    description:
      "How Toucan colors the Command Center and the status bar, and how to set and clear a color.",
  },
  {
    slug: "presets",
    title: "Presets",
    description: "The 16 toucan-themed preset colors and the low-contrast warning.",
  },
  {
    slug: "glyphs",
    title: "Glyphs",
    description: "The 17 status bar glyphs in four groups, and how to pick one.",
  },
  {
    slug: "sidebar",
    title: "Sidebar block",
    description:
      "The opt-in color block in the secondary sidebar: full or muted, always or unfocused.",
  },
  {
    slug: "search-emoji",
    title: "Search emoji",
    description: "The experimental colored emoji in the Command Center label.",
  },
  {
    slug: "settings",
    title: "Settings",
    description: "Every Toucan setting, with the shape of toucan.repos.",
  },
  {
    slug: "commands",
    title: "Commands",
    description: "Toucan's five commands and where to find them.",
  },
];
