# Thinking trail: Docs sync skill

## Starting framing

During the maintenance run, Marco chose to keep docs in sync through a CLAUDE.md rule rather than an automated dead-reference test. He then asked for a backlog item: a "linting, cleanup and sync" skill for the docs, run every once in a while, that follows all changes since its last run and tries to track down whatever was missed ([issue #6](https://github.com/Marco-Daniel/Toucan/issues/6)). He wanted it brainstormed first.

## Turns

No turns: the design went from question to agreement without a change of mind; see `decisions/`.

## Rejected without a decision file

- Running it from CI or a hook: Marco wants it run by hand, every once in a while.
- Checking the issue backlog or PR templates: out of scope for now.

## Open / to re-check

- The first real run: a full sweep, since there's no tag yet. Its report is the first measure of how useful the skill is.
