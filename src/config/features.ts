/**
 * FEATURE FLAGS — what a release shows, not what the codebase contains.
 *
 * `atlas` — NEOGEN Atlas is deferred to V2 (owner, 2026-09-17) and frozen, not
 * deleted. With the flag off it has no entry point: no header link, no footer
 * link, no sitemap entry, and its page is marked noindex. `/atlas` still
 * renders for anyone who types it, so the frozen work can be reviewed, and
 * `check:atlas` keeps proving it. Turning it back on is this one line.
 */
export const features = {
  atlas: false,
} as const;
