# Architecture decisions

The decisions that shape Toucan as a whole, one per file. Plan folders (`docs/plans/*/decisions/`) record how a piece of work was decided; a rule that outlives its plan is lifted here. Cite these as `ADR-NNNN`. A test keeps this index complete and fails on a cited ADR that doesn't exist or, in code and the guides, isn't Accepted; ADRs and plans may cite one that was superseded since.

## The system

Toucan colors each VS Code window by its repository: the focused window's Command Center, a status bar glyph with the repo name in every window with a configured repo, and, opt-in, a sidebar block and an experimental search emoji.

- **Where it writes.** Only user settings, never the repo ([ADR-0001](0001-keep-toucans-settings-in-user-scope.md)). In `workbench.colorCustomizations` it owns the `commandCenter.*` keys and nothing else ([ADR-0002](0002-toucan-owns-the-commandcenter-keys.md)).
- **What it relies on.** Stable VS Code API; the one internal trick is opt-in and experimental ([ADR-0003](0003-use-stable-vs-code-api-only.md)). Every window with a configured repo shows it in the status bar, focused or not ([ADR-0005](0005-always-show-a-status-bar-glyph-and-repo-name.md)).
- **How the code is organised.** `src/core/`, `src/shared/<topic>/` and `src/features/<name>/`, with role suffixes and no barrels ([ADR-0010](0010-source-layout.md)). Only adapters import `vscode`, so the logic is unit-tested without it ([ADR-0006](0006-only-adapters-import-vscode.md)). Caught errors go through tryCatch ([ADR-0009](0009-trycatch-for-caught-errors.md)).
- **How it's checked.** A modern toolchain ([ADR-0004](0004-use-a-modern-toolchain.md)), lint with no warnings ([ADR-0007](0007-no-lint-warnings.md)), and mutation testing outside the qmd scripts ([ADR-0012](0012-no-mutation-testing-for-scripts-qmd.md)). Agents find the docs through qmd ([ADR-0011](0011-qmd-docs-search.md)); every release ships notes ([ADR-0013](0013-release-notes-for-every-release.md)).

**Direction.** Every lint ignore states its reason; a lint rule will enforce that once oxlint's plugin support allows it ([ADR-0008](0008-lint-ignores-state-a-reason.md), tracked).

## Kinds

- **constraint**: a rule code must follow.
- **background**: context that explains the system.
- **direction**: where the code is heading; its `Migration` line says how (`as touched`, or `tracked` as its own work).

## Index

### all

| ADR | Decision | Kind | Status |
|---|---|---|---|
| [0003](0003-use-stable-vs-code-api-only.md) | Use stable VS Code API only, internals opt-in and experimental | constraint | Accepted |

### settings

| ADR | Decision | Kind | Status |
|---|---|---|---|
| [0001](0001-keep-toucans-settings-in-user-scope.md) | Keep Toucan's settings in user scope, never in the repo | constraint | Accepted |

### colors

| ADR | Decision | Kind | Status |
|---|---|---|---|
| [0002](0002-toucan-owns-the-commandcenter-keys.md) | Toucan owns the `commandCenter.*` color keys | constraint | Accepted |

### statusBar

| ADR | Decision | Kind | Status |
|---|---|---|---|
| [0005](0005-always-show-a-status-bar-glyph-and-repo-name.md) | Always show a status bar glyph and repo name | constraint | Accepted |

### layout

| ADR | Decision | Kind | Status |
|---|---|---|---|
| [0006](0006-only-adapters-import-vscode.md) | Only adapters import vscode | constraint | Accepted |
| [0010](0010-source-layout.md) | Source layout: core, shared and features | constraint | Accepted |
| [0014](0014-monorepo-layout.md) | Monorepo layout: apps, packages, config, and the root's own tooling | constraint | Accepted |

### errors

| ADR | Decision | Kind | Status |
|---|---|---|---|
| [0009](0009-trycatch-for-caught-errors.md) | tryCatch for every caught error | constraint | Accepted |

### tooling

| ADR | Decision | Kind | Status |
|---|---|---|---|
| [0004](0004-use-a-modern-toolchain.md) | Use a modern toolchain | background | Accepted |
| [0007](0007-no-lint-warnings.md) | No lint warnings | constraint | Accepted |
| [0008](0008-lint-ignores-state-a-reason.md) | Lint ignores state a reason | direction | Accepted |

### testing

| ADR | Decision | Kind | Status |
|---|---|---|---|
| [0012](0012-no-mutation-testing-for-scripts-qmd.md) | No mutation testing for scripts/qmd | constraint | Accepted |

### docs

| ADR | Decision | Kind | Status |
|---|---|---|---|
| [0011](0011-qmd-docs-search.md) | qmd docs search is part of the setup | constraint | Accepted |

### releases

| ADR | Decision | Kind | Status |
|---|---|---|---|
| [0013](0013-release-notes-for-every-release.md) | Every release ships GitHub release notes | constraint | Accepted |

## Adding one

Take the next number and the header the others use (Status, Date, Deciders, Kind, Area, plus Migration for a direction), add its row here under its area, and link the plan decision it came from. To replace one, set the old one's status to `Superseded by ADR-NNNN` instead of deleting it.
