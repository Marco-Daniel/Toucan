/**
 * The texts of Toucan's notifications and dialogs. Every `show*Message` call
 * takes its text from here or from a plain string literal (a test enforces it).
 *
 * None of them may include the folder name: it comes from the workspace (a
 * cloned directory, or a `.code-workspace` folder "name"), and VS Code renders
 * markdown links in notification messages, `command:` links included, even in
 * Restricted Mode. A folder named `[Fix](command:…)` would otherwise put a
 * one-click command into Toucan's own message.
 */
export const NO_COLOR_YET = "This folder has no Toucan color yet. Set a color first.";
export const NO_COLOR = "This folder has no Toucan color.";

/** Clear Color's confirmation for an entry with more than a color (modal). */
export const CLEAR_CONFIRMATION = "Clear Toucan's settings for this folder?";

/** The confirmation's detail; the field names come from the user's own settings. */
export function clearDetail(handEdited: readonly string[]): string {
  return `This removes its whole entry from toucan.repos, including ${handEdited.join(", ")}.`;
}

export const AGENTS_CONTROL_OFFER =
  'Toucan\'s color needs the classic search bar. Set chat.agentsControl.enabled to "badge"?';

export function saveFailed(error: unknown): string {
  return `Toucan couldn't save toucan.repos: ${String(error)}`;
}

export function titleChangeFailed(error: unknown): string {
  return `Toucan couldn't change window.title: ${String(error)}`;
}
