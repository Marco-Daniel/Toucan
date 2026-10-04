# Thinking trail: Marketplace launch

## Starting framing

Marco wanted to publish Toucan "officially on the Microsoft store", once the website was online. That meant the Visual Studio Marketplace, with Open VSX in mind too.

## Turns

**From "store" to the Marketplace and Open VSX.** VS Code extensions are published on the Visual Studio Marketplace, not the Microsoft Store. Open VSX serves the VS Code-based editors that aren't Microsoft's. Marco chose to launch on the VS Code Marketplace first and treat Open VSX as step 2. → 0001

**A real launch, at 1.0.0.** Offered a public launch at 0.1.0, a quiet listing or a pre-release first, Marco chose a public launch and named the version himself: v1.0.0. → 0001

**The token question settled itself.** DevOps' research showed that Azure DevOps retires global PATs on 1 December 2026, the only kind vsce can publish with. A PAT would have broken within two months, so Marco went straight to Entra ID. → 0002

**Automatic, not gated.** Recommended a required-reviewer click per publish; Marco chose fully automatic. The release itself is the control point. → 0003

**Store page and wording.** Marco accepted the manifest proposals and asked for a snappier description. He picked the first option and liked "Color-code your VS Code windows" from the third, so that line became the README opener and joins the website. → 0006, 0007

**A preview after all.** Marco asked to see the store page before launch, as with the website design. → 0008

**Facts before the plan.** Marco asked to verify facts online before writing the plan. The check confirmed the route and changed it in three places:
- immutable releases require draft releases with the assets attached → 0004;
- GITHUB_TOKEN-published releases don't trigger workflows, so the release is published as Marco → 0004;
- the repo's OIDC subject uses GitHub's newer immutable format, so it must be read from a real token before creating the federated credential.

It also showed that trusted publishing isn't enabled yet. → 0002

**DevOps' security review of the model.** Before building, DevOps tightened it:
- vsce is installed from the lockfile before the Azure sign-in, never fetched afterwards;
- the environment allows `v*` tags only;
- the managed identity gets no Azure role;
- the packaging workflow is split so the dependency-running job never holds `contents: write`;
- the attestation check is pinned to the packaging workflow on main;
- `v*` tag creation is restricted to Marco.

The plan and 0002 were updated accordingly. → 0002, 0004, 0005

**Changelog.** The Marketplace shows a Changelog section when the package has CHANGELOG.md. Marco: "we already keep track of it for releases", so it's generated from the release notes. → 0010

## Rejected without a decision file

- A hand upload through the publisher page's "New extension": every release goes through the workflow.
- Rebuilding the VSIX in the publish job: it must publish exactly the released file.

## Open / to re-check

- Whether the Azure portal wizard fills in the immutable subject format.
- Creator versus Contributor for the identity (use Contributor, as documented).
- When the Marketplace enables trusted publishing: a follow-up plan to drop Azure.
