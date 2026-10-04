# Progress: Hand upload

<!-- Living log. Implementers append newest entries at the top. The planner
     leaves this body empty. Each entry: date, who/what, what changed, what's
     next or blocked. -->

## 2026-10-04: the implementer, `manual-marketplace-upload`

- Did: the `/marketplace-upload` skill (`.claude/skills/marketplace-upload/SKILL.md`) and its script, `scripts/marketplace-upload.mts`. The script sits with the repo's other tooling, so `lint:repo`, `typecheck:repo` and `test/scripts/marketplace-upload.test.ts` cover it: `verify <version>` checks the release's VSIX as publish.yml's verify job does; `published <version>` asks the public gallery. publish.yml's `publish` job is gated on the repository variable `MARKETPLACE_PUBLISH` (→ 0004's note). `marketplace-identity.yml` is deleted. The README's Releasing section and ADR-0015 are updated, with pointers on marketplace-launch's 0002 and 0003.
- Checked by hand: `published` against a well-known extension lists its versions; `verify 0.0.4` stops at `verify-asset`, because 0.0.4 predates release attestations.
- Next: the 1.0.0 bump PR, with the version and the notes only; then `verify` against the real 1.0.0 release, before Marco uploads.

