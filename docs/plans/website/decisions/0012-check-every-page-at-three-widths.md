# 0012. Check every page at phone, tablet and desktop width

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

The first mockup scrolled sideways at phone width (grid items with long code lines). Marco asked that the site works properly on mobile.

## Considered Options

- **Every page checked at 390 px, about 768 px and 1280 px, with screenshots as proof**
- Desktop only

## Decision Outcome

Chosen: **three widths**, every page, every PR that changes the site. No horizontal scroll at 390 px, readable type, tap targets at least 44 px.

## Consequences

- Good: mobile problems show up in review, not in production.
- Bad: more screenshots per review.
