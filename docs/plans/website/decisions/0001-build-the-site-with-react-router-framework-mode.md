# 0001. Build the site with React Router framework mode, pre-rendered

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

Toucan needs a public website. Marco wanted static React with Vite and the Gatsby experience (pages pre-rendered at build time, build-time data, plain files to host), but not Gatsby itself.

## Considered Options

- **React Router v8 framework mode** with `ssr: false` and `prerender`
- vite-react-ssg
- Vike in prerender mode
- A hand-rolled Vite prerender plugin
- Astro with React islands
- TanStack Start
- Gatsby

## Decision Outcome

Chosen: **React Router framework mode**. It is the official, widely used way to pre-render a Vite + React site: React pages, per-route `meta`, build-time `loader`s, optional file routes, and plain static output Netlify serves as is. Marco's first hunch was vite-react-ssg, but the research (October 2026) showed it has one maintainer, few releases and depends on react-router v6, which reached end of life in June 2026; its own README points React Router v7+ users to React Router's built-in pre-rendering. Vike is 0.x and mostly one maintainer. A hand-rolled plugin means owning routing, data loading and hydration. Astro is the community default for content sites, but its pages aren't React. TanStack Start is a full-stack framework with heavy churn. Gatsby was ruled out by Marco.

## Consequences

- Good: React pages, Gatsby-like loaders and meta, backed by a large team, supported by Netlify.
- Bad: React Router ships roughly one breaking major a year; upgrades are planned work.
