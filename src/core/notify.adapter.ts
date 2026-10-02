import { window } from "vscode";

interface NotifyArgs {
  level: "info" | "warning" | "error";
  message: string;
}

/**
 * Shows a non-modal notification without waiting for it. Its Thenable only
 * settles when the user dismisses it, so awaiting would stall the caller, and
 * there's no outcome to handle: it has no buttons and never rejects.
 */

export function notify({ level, message }: NotifyArgs): void {
  const shown =
    level === "info"
      ? window.showInformationMessage(message)
      : level === "warning"
        ? window.showWarningMessage(message)
        : window.showErrorMessage(message);
  // oxlint-disable-next-line no-void -- see above: nothing to wait for, nothing to handle
  void shown;
}
