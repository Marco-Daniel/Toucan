/**
 * Texts of Toucan's notifications and dialogs that concern the open folder.
 *
 * They never include the folder name: it comes from the workspace (a cloned
 * directory, or a `.code-workspace` folder "name"), and VS Code renders
 * markdown links in notification messages, `command:` links included, even
 * in Restricted Mode. A folder named `[Fix](command:…)` would otherwise put a
 * one-click command into Toucan's own message.
 */
export const NO_COLOR_YET = "This folder has no Toucan color yet. Set a color first.";
export const NO_COLOR = "This folder has no Toucan color.";

/** Clear Color's confirmation for an entry with more than a color (modal, so not link-parsed; still no name). */
export function clearConfirmation(handEdited: readonly string[]): {
  message: string;
  detail: string;
} {
  return {
    message: "Clear Toucan's settings for this folder?",
    detail: `This removes its whole entry from toucan.repos, including ${handEdited.join(", ")}.`,
  };
}
