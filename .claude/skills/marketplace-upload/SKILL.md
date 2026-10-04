---
name: marketplace-upload
description: Helps Marco upload a published Toucan release to the VS Code Marketplace by hand. Downloads the release's VSIX, verifies it (release asset, SHA-256 in the notes, build attestation), prints the file's path and the publisher page's link, and afterwards checks that the Marketplace lists the version. Never logs in anywhere and never uploads; Marco uploads it himself in a private browser window. Use after a release is published, while publish.yml's Azure job is dormant (ADR-0015).
argument-hint: "<version, e.g. 1.0.0>"
---

# marketplace-upload

Until the Marketplace supports trusted publishing, Marco uploads each release's VSIX through the publisher page himself ([ADR-0015](../../../docs/adr/0015-release-through-drafts-and-publish-from-actions.md)). This skill makes sure he uploads exactly the file that was released, and checks the result. It never signs in to anything, never touches a browser session, and never uploads.

## 1. The version

Take the version from the argument (`1.0.0`, without the `v`). If there is none, ask for it. The release `v<version>` must already be **published** on GitHub (publishing it is Marco's per-release decision, never this skill's); a draft doesn't count.

## 2. Verify the VSIX

Run, from the repo root:

```sh
node scripts/marketplace-upload.mts verify <version>
```

gh needs an account that can read the repo. If gh has several accounts logged in, pass the repo owner's token for this one command: `GH_TOKEN=$(gh auth token --user Marco-Daniel) node scripts/marketplace-upload.mts verify <version>`. Never switch gh's active account.

It downloads `toucan-<version>.vsix` into a fresh folder in the OS temp folder and checks, with the same pins as publish.yml's verify job:

- it's the release's own asset (`gh release verify-asset`);
- its SHA-256 is the one the release notes name;
- `package.yml` attested it from `main` (`gh attestation verify`).

If any check fails, stop and show the error: the file must not be uploaded.

## 3. Hand over

When the checks pass, show Marco, in chat:

- the version, the file's path and its SHA-256, as the script printed them;
- the publisher page's link: **https://marketplace.visualstudio.com/manage/publishers/marco-daniel**;
- what to do there: for the first release, **New extension → Visual Studio Code** and choose the file; after that, the existing Toucan's **…** → **Update**, and choose the file.

He must use a **private window**: a normal one brings his signed-in work account, which interferes. Don't open a normal browser window, ever. Offer once to open the link in a private window; only if he says yes, check which browsers are in `/Applications`, and open it with the first match:

- Google Chrome: `open -na "Google Chrome" --args --incognito <link>`
- Firefox: `open -na Firefox --args -private-window <link>`

With neither (Safari can't be told to open a private window), just print the link. Then wait: Marco uploads the file himself and tells you when he's done.

## 4. Check the Marketplace

After he says it's uploaded, run:

```sh
node scripts/marketplace-upload.mts published <version>
```

It asks the Marketplace's public gallery, with no login, which versions it lists. The Marketplace verifies an upload for a few minutes before listing it: if the version isn't listed yet, say so, wait a minute or two, and ask again, up to about ten minutes. Report the result. If it's still missing after that, show what the Marketplace lists and ask Marco to look at the publisher page.

Afterwards, the downloaded copy in the temp folder can go; say where it is, and leave removing it to Marco.
