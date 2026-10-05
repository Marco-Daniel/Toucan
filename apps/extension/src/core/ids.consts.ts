// Ids that package.json declares too; test/manifest.test.ts keeps them in sync.

/** The status bar item's id (not in package.json, but stable across reloads). */
export const STATUS_ITEM_ID = "toucan.indicator";
/** The sidebar block's webview view, in the Explorer. */
export const SIDEBAR_VIEW_ID = "toucan.block";
/** Context key in the view's `when` clause: the block is enabled and the repo has a color. */
export const SIDEBAR_AVAILABLE_CONTEXT = "toucan.sidebarBlockAvailable";
/** Context key in the view's `when` clause: the block isn't remembered as closed in this workspace. */
export const SIDEBAR_SHOWN_CONTEXT = "toucan.sidebarBlockShown";
