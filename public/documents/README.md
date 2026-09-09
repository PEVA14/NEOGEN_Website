# Documents

Certificates of analysis, technical sheets and handling protocols.

**Empty on purpose.** No document has been produced or verified for any
compound, so the product page and the research hub render their neutral
unavailable state throughout.

## How to add one

Place the file here, then declare it in `src/content/documents.ts`:

```ts
reta: {
  coa: { href: "/documents/reta-coa-2026-01.pdf", format: "PDF", size: "412 KB", issued: "2026-01-14" },
  ...
},
```

The ledger then renders a real download link in place of the unavailable state.

## Conventions

- `size` and `issued` are **read off the real file**, never estimated. A link
  that starts a download should say what it is about to hand you.
- Version the filename when a document changes — files under `public/` are
  served with long-lived cache headers.
- A record is either a link or an unavailable state. Never a link that resolves
  to nothing.
- Nothing here may be presented as verified unless it is. The green
  `--status-verified` token exists but is deliberately unused; see
  `docs/CONVENTIONS.md` §8.
