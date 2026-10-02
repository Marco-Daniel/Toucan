import { window, type QuickPickItem } from "vscode";
import type { RepoConfig } from "../../shared/config/config.util.ts";
import type { CommandHost } from "./commands.adapter.ts";
import { Preview } from "./preview.adapter.ts";

/**
 * A quick pick that previews the active item on the status bar. On cancel the
 * preview ends; after a pick the caller saves and then calls `done`.
 */
export function pickWithPreview<T extends QuickPickItem>(
  host: CommandHost,
  name: string,
  items: T[],
  title: string,
  change: (item: T) => Partial<RepoConfig>,
  active: T | undefined,
): Promise<{ item: T; done: () => void } | undefined> {
  const preview = new Preview(host, name);
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
