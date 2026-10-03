# Security

## Reporting a vulnerability

Please report security problems privately, through GitHub: [report a vulnerability](https://github.com/Marco-Daniel/Toucan/security/advisories/new). Don't open a public issue for them.

A useful report says:

- what the problem is and what an attacker could do with it
- how to reproduce it: the Toucan version, the VS Code version and the steps
- any fix you'd suggest

Toucan is maintained by one person, so replies are best effort. You'll get an answer in the advisory, and a fix goes out as a new release with the advisory published once it's out.

## Supported versions

Only the latest release gets security fixes. Install it from the [releases page](https://github.com/Marco-Daniel/Toucan/releases), and check the download against the SHA-256 in its release notes.

## Scope

- the extension itself: what it reads, and what it writes to your VS Code settings
- this repository's build, test and release tooling, and its GitHub Actions workflows

Problems in VS Code itself, or in a dependency, belong with that project; if Toucan is affected, a report here is still welcome.
