/*
 * The App Router renders with React's canary build (19.3 at the time of the
 * spike), which exports `ViewTransition`. The types for it live in
 * `@types/react/canary` and nothing in the project referenced them yet.
 * Scoped to the spike so removing the folder removes the reference.
 */
/// <reference types="react/canary" />
