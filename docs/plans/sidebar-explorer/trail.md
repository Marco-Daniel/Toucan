# Thinking trail: The sidebar block lives in the Explorer

## Starting framing

After v1.0.0, Marco turned the block on and didn't see it: in `always` mode Toucan never opens the secondary sidebar. He dragged it into the Explorer and, with a screenshot of it at the top of the primary sidebar, asked: "when we set that show sidebar option in toucan, i would prefer it defaulted in the main sidebar in the way it looks in the screenshot, is that possible?" The assumption: the screenshot's position (top of the Explorer) could be the default.

## Turns

**The top isn't ours to pick.** The lead checked that an extension view can't be placed above the Explorer's own sections; the screenshot's position came from Marco's drag. The default is VS Code's placement, and the drag sticks. → 0003

**`unfocused` doesn't survive the move.** Its reveal-on-blur and close-on-focus only made sense with a separate bar; in the Explorer it would switch or hide the user's primary sidebar. Put to Marco with a recommendation to drop it; he chose to drop it, noting it means doc updates too. → 0002

**"Close" needs a new meaning.** The new implementer's read-through found that Toggle Sidebar Block's `closeAuxiliaryBar` would become closing the whole primary sidebar. Rather than guess, the plan makes recording the Explorer's visibility events the first task, with a when-clause hide as the starting proposal. → 0001, plan Approach

**The visibility finding.** The implementer measured the Explorer in an isolated VS Code: collapse, a hidden sidebar and another primary view all report `visible=false`, so none can signal a close; only the Hide from the "…" menu differs, and it arrives as a dispose with no visibility event, the same as the `when` key going false. The proposal: hide through a context key, count only a dispose with the key still true as a Hide, never use `visible=false`, reveal once per workspace. The lead added that a dispose isn't always a Hide (a drag can resolve the view again), so the flag is written only after a short delay if the view hasn't been resolved again, and that Toggle on a collapsed block means "show". → 0006

**Round 1: the reveal switched views; an old close carried over.** The blind reviewer found that the one-time `.focus` reveal switches Search or Source Control to the Explorer, and that reusing `sidebarBlock.closed` would hide the block for anyone who had switched the secondary sidebar to Chat in 1.0.0. All three agreed: `"visibility": "visible"` in the manifest instead of a reveal, a new key, `.focus` only on Toggle (show). → 0007

**Testing before the version.** Marco added mid-planning that this needs proper testing in VS Code before the version is made; it became a gate before the bump PR. → 0004

**A new team.** Marco brought in a new implementer, blind reviewer and DevOps for this work; the earlier sessions stood down with nothing open.

## Rejected without a decision file

- **Runtime moves through internal workbench commands** to force the top position: not stable API.

## Open / to re-check

- Whether the dispose timer holds up in the test run (drags, host restart, disable and enable).
- How the upgrade from 1.0.0 behaves for users with the block in the secondary sidebar.
- When to delete the deprecated `visibility` settings.
