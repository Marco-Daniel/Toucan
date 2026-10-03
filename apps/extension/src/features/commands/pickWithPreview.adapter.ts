// import vscode
import { window } from "vscode";

// import adapters
import { Preview } from "./preview.adapter.ts";

// import types
import type { QuickPickItem } from "vscode";
import type { RepoConfig } from "../../shared/config/config.util.ts";
import type { CommandArgs } from "./commands.adapter.ts";

interface PickWithPreviewArgs<T> extends CommandArgs {
  items: T[];
  title: string;
  /** The preview for an item. */
  change: (item: T) => Partial<RepoConfig>;
  /** The item to start on. */
  active: T | undefined;
}

/**
 * A quick pick that previews the active item on the status bar. On cancel the
 * preview ends; after a pick the caller saves and then calls `done`.
 */
export function pickWithPreview<T extends QuickPickItem>({
  host,
  name,
  items,
  title,
  change,
  active,
}: PickWithPreviewArgs<T>): Promise<{ item: T; done: () => void } | undefined> {
  const preview = new Preview({ host, name });
  const pick = window.createQuickPick<T>();
  pick.title = title;
  pick.items = items;
  if (active) {
    pick.activeItems = [active];
  }
  return new Promise((resolve) => {
    let picked: T | undefined;
    pick.onDidChangeActive(([item]) => {
      if (item) {
        preview.show(change(item));
      }
    });
    pick.onDidAccept(() => {
      picked = pick.selectedItems[0] ?? pick.activeItems[0];
      pick.hide();
    });
    pick.onDidHide(() => {
      pick.dispose();
      if (picked) {
        resolve({ item: picked, done: () => preview.restore() });
      } else {
        preview.restore();
        resolve(undefined);
      }
    });
    pick.show();
  });
}
