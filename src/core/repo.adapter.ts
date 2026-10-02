import { workspace } from "vscode";
import { parseRepos } from "../shared/config/config.util.ts";
import type { RepoConfig } from "../shared/config/config.util.ts";
import type { IssueReporter } from "../shared/config/issues.util.ts";
import { configs } from "../generated/meta.ts";

export interface ActiveRepo {
  /** Workspace folder name, the key in `toucan.repos`. */
  name: string;
  config: RepoConfig;
}

/**
 * Looks up this window's repo: the first workspace folder (toucan-v1/0009) in
 * `toucan.repos` (ADR-0001). The key is the folder's display name, which a
 * `.code-workspace` file can set; otherwise it's the directory name. Returns `undefined` for an empty window or a repo
 * without an entry (toucan-v1/0008).
 */
export function resolveActiveRepo(reporter: IssueReporter): ActiveRepo | undefined {
  const { repos, issues } = parseRepos(workspace.getConfiguration().get(configs.repos.key));
  reporter.report(issues);

  const name = workspace.workspaceFolders?.[0]?.name;
  const config = name === undefined ? undefined : repos.get(name);
  return name === undefined || config === undefined ? undefined : { name, config };
}
