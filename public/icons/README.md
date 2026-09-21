# Icons

Inline SVG or sprite assets.

- No icon library is installed. Add icons as local SVG rather than pulling in a
  dependency for a handful of glyphs.
- Icons are decorative by default: mark them `aria-hidden="true"` and give the
  interactive parent an accessible name (see `VisuallyHidden`).

The **brand mark is not an icon** and does not live here. It is the owner's
artwork in `public/branding/`, applied as an alpha mask over `currentColor` —
see CONVENTIONS §19. The favicon is generated from it into `src/app/icon.png`
by `npm run brand`; do not hand-draw a replacement, which is what `icon.svg`
was before the real mark existed.
