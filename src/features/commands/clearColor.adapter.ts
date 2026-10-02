// import vscode
import { window } from "vscode";

// import adapters
import { notify } from "../../core/notify.adapter.ts";
import { userValue } from "../settings/settings.adapter.ts";
import { writeRepos } from "./commandUi.adapter.ts";

// import utils
import { handEditedKeys, withoutRepo } from "./entries.util.ts";
import { isRecord } from "../../shared/records/records.util.ts";

// import consts
import { configs } from "../../generated/meta.ts";

// import messages
import {
  CLEAR_CONFIRMATION,
  NO_COLOR,
  clearDetail,
} from "../../shared/messages/notifications.messages.ts";

// import types
import type { CommandArgs } from "./commands.adapter.ts";

export async function clearColor({ host, name }: CommandArgs): Promise<void> {
  const raw = readRepos();
  if (!isRecord(raw) || !Object.hasOwn(raw, name)) {
    notify({ level: "info", message: NO_COLOR });
    return;
  }
  // Only a bare color is cheap to set again; anything more was typed by hand.
  const handEdited = handEditedKeys({ raw, repo: name });
  if (handEdited.length > 0) {
    const answer = await window.showWarningMessage(
      CLEAR_CONFIRMATION,
      { modal: true, detail: clearDetail(handEdited) },
      "Clear",
    );
    if (answer !== "Clear") {
      return;
    }
  }
  // From the settings at write time, not `raw`: the dialog may have been open
  // while another window changed a different repo.
  await writeRepos({
    host,
    update: (repos) => ({ value: withoutRepo({ raw: repos, repo: name }) }),
  });
}

/**
 * The user's toucan.repos as VS Code sees it. In a window that just opened,
 * the view can briefly miss another window's edit; the writes therefore run
 * as updaters on the value at write time.
 */
function readRepos(): unknown {
  return userValue(configs.repos.key);
}
