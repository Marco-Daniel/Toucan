// import types
import type { ConfigIssue } from "./config.util.ts";

/** The part of VS Code's `LogOutputChannel` the reporter uses. */
export interface IssueLog {
  info(message: string): void;
  warn(message: string): void;
}

interface IssueReporterArgs {
  log: IssueLog;
  /** The setting's key, named in every message. */
  setting: string;
}

/** Logs config issues, once per change, so every refresh doesn't repeat them. */
export class IssueReporter {
  // Starts as "no issues", so a clean config logs nothing at startup.
  private last = "[]";

  private readonly log: IssueLog;
  private readonly setting: string;

  constructor({ log, setting }: IssueReporterArgs) {
    this.log = log;
    this.setting = setting;
  }

  report(issues: readonly ConfigIssue[]): void {
    const current = JSON.stringify(issues);
    if (current === this.last) {
      return;
    }
    this.last = current;
    if (issues.length === 0) {
      this.log.info(`${this.setting} has no problems.`);
      return;
    }
    for (const { repo, message } of issues) {
      this.log.warn(repo === undefined ? message : `${this.setting} › ${repo}: ${message}`);
    }
  }
}
