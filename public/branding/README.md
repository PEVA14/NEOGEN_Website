# Brand artwork

Two files here are the OWNER'S, and two are derived from them. Do not edit the
derived ones by hand — regenerate them:

```
npm run brand          # scripts/prepare-brand.mjs
```

| file                   | what it is                                    |
| ---------------------- | --------------------------------------------- |
| `NEOGEN Branding.png`  | source — the mark alone (the molecule)        |
| `NEOGEN Full Logo.png` | source — the lockup: mark + NEOGEN / PEPTIDES |
| `neogen-mark.png`      | derived — the mark, trimmed to its ink        |
| `neogen-logo.png`      | derived — the lockup, trimmed to its ink      |

`src/app/icon.png` (the favicon) is derived from the mark by the same script.

## Why the derived files exist

Both sources are pure black on an alpha channel, which makes them **masks**
rather than pictures. That is what lets one file be graphite on the light
header, paper on the inverted footer, and printed ink on a rendered label,
without a second export or a colour baked in. The site never uses them as an
`<img>`: it masks a block of `currentColor` with them, so the mark takes the
ink of whatever surface it lands on.

They are not used directly because each carries a wide, uneven margin — the
mark's ink is 389×485 inside a 447×531 sheet. Trimming once, in the script,
makes the file's box the artwork's box, so a caller only has to say how tall
the mark should be. The alternative is a margin correction at every call site
that goes quietly wrong the next time the artwork is re-exported.

## Where the artwork is used

- `components/layout/SiteHeader` — the mark before the wordmark.
- `components/layout/SiteFooter` — the mark over the oversized wordmark.
- `components/experience/studio/label.ts` — the lockup printed on the label of
  every product that has no label artwork of its own. The three flagships do
  not use it: their labels are printed into their `.glb` in Blender, so putting
  the lockup on **their** vials is an export, not a code change.
- `src/app/icon.png` — the favicon.

## Replacing the artwork

Drop the new export over the source file, keeping its name, run `npm run brand`,
and commit what it writes. If the new export is not black-on-alpha, the masking
above stops working and the mark will render as a solid block — say so rather
than working around it here.
