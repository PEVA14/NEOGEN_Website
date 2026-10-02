/**
 * THE BENCH, WHILE IT IS A PROTOTYPE (2026-10-02, overnight session).
 *
 * The products whose page opens on the bench (`ProductBench`) rather than the
 * plate (`ProductPlate`). An allowlist on purpose: the owner asked for the
 * baseline to be proven on Semaglutide and stress-tested on a few products
 * that differ, NOT rolled across the catalogue. Removing a slug here returns
 * its page to exactly what it was.
 */
export const BENCH_PROTOTYPES: ReadonlySet<string> = new Set([
  // The baseline: a render, split into set and object (enhanced capability).
  "semaglutide",
  // Stress tests, drawn (standard capability), chosen to differ in the data:
  "tirzepatide", // the same area as Semaglutide, sold by mass in 7 presentations
  "bac-water", // sold by volume: a liquid, in the materials area
  "lipo-c-with-b12", // a stated five-part composition, one presentation
  "hcg", // sold in units (IU), hormonal area
  // Trying to break it:
  "cjc-1295-without-dac-ipamorelin", // the longest name, a two-part blend
  "dermorphin", // no discovery area at all
  "healthy-hair-skin-nails-blend", // a liquid with a long name, skin area
]);
