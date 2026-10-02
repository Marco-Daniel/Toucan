import { ConfigurationTarget, window, workspace } from "vscode";
import type { ExtensionContext } from "vscode";
import { AGENTS_CONTROL_OFFER } from "./core/messages.ts";
import type { Log } from "./log.ts";
import { AGENTS_CONTROL, agentsControlAction } from "./core/agentsControl.ts";

/** globalState key for "Not now" (per profile). */
const DECLINED_KEY = "agentsControl.declined";

/**
 * Offers once to switch Agents control to "badge" so the Command Center can
 * show Toucan's background (toucan-v1/0016). Never changes it without asking, never
 * changes it back.
 */
export class AgentsControlOffer {
  /** Checked at most once per window session. */
  private checked = false;

  private readonly context: ExtensionContext;
  private readonly log: Log;

  constructor(context: ExtensionContext, log: Log) {
    this.context = context;
    this.log = log;
  }

  /** Call when this window colors the Command Center: focused, with a configured repo. */
  async check(): Promise<void> {
    if (this.checked) {
      return;
    }
    this.checked = true;

    const configuration = workspace.getConfiguration();
    const inspected = configuration.inspect(AGENTS_CONTROL);
    const action = agentsControlAction({
      registered: inspected?.defaultValue !== undefined,
      effective: configuration.get(AGENTS_CONTROL),
      workspaceDecides:
        inspected?.workspaceValue !== undefined || inspected?.workspaceFolderValue !== undefined,
      declined: this.context.globalState.get<boolean>(DECLINED_KEY, false),
    });

    if (action === "log") {
      this.log.info(
        `${AGENTS_CONTROL} is "compact", so the Command Center shows only Toucan's border and text color. Set it to "badge" for the full color.`,
      );
    }
    if (action !== "offer") {
      return;
    }

    const answer = await window.showInformationMessage(AGENTS_CONTROL_OFFER, "Switch", "Not now");
    if (answer === "Switch") {
      await configuration.update(AGENTS_CONTROL, "badge", ConfigurationTarget.Global);
      this.log.info(`Set ${AGENTS_CONTROL} to "badge".`);
    } else if (answer === "Not now") {
      await this.context.globalState.update(DECLINED_KEY, true);
    }
    // Dismissed without an answer: ask again in the next session.
  }
}
