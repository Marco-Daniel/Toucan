// Ids that package.json declares too; test/manifest.test.ts keeps them in sync.

/** The status bar item's id (not in package.json, but stable across reloads). */
export const STATUS_ITEM_ID = "toucan.indicator";
/** The secondary sidebar view container. */
export const SIDEBAR_CONTAINER_ID = "toucan";
/** The sidebar block's webview view. */
export const SIDEBAR_VIEW_ID = "toucan.block";
/** Context key in the view's `when` clause: the block is enabled and the repo has a color. */
export const SIDEBAR_AVAILABLE_CONTEXT = "toucan.sidebarBlockAvailable";
