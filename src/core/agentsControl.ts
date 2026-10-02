/** VS Code's experimental setting whose "compact" mode hides the Command Center background (toucan-v1/0016). */
export const AGENTS_CONTROL = "chat.agentsControl.enabled";

export interface AgentsControlState {
  /** Whether this VS Code build has the setting (`inspect().defaultValue !== undefined`). */
  registered: boolean;
  /** The value in effect for this window, defaults included. */
  effective: unknown;
  /** Whether a workspace or folder value decides it; a user-settings write can't change that. */
  workspaceDecides: boolean;
  /** Whether the user answered "Not now" before. */
  declined: boolean;
}

/**
 * Whether to offer switching Agents control to "badge" (toucan-v1/0016): only when the
 * setting exists, compact mode is in effect, and a user-settings write would
 * actually change it. After "Not now", only log.
 */
export function agentsControlAction(state: AgentsControlState): "offer" | "log" | "none" {
  if (!state.registered || state.effective !== "compact" || state.workspaceDecides) {
    return "none";
  }
  return state.declined ? "log" : "offer";
}
