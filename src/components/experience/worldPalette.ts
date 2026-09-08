/**
 * Bridge between the CSS colour layer and the 3D layer.
 *
 * CONVENTIONS §3 splits a product world in two: colour lives in
 * `src/styles/worlds.css`, non-colour intent in `src/config/worlds.ts`.
 * The lighting rig needs colour, but duplicating the hexes into TypeScript
 * would create a second source of truth that silently drifts.
 *
 * So we read them back off the live element instead. `worlds.css` stays
 * canonical, and re-theming a world is still a one-file change.
 */
export interface WorldPalette {
  void: string;
  accent: string;
  light: string;
}

/** Used only if the custom properties cannot be read (detached node, jsdom). */
const FALLBACK: WorldPalette = {
  void: "#07090d",
  accent: "#ffffff",
  light: "#ffffff",
};

export function readWorldPalette(element: HTMLElement | null): WorldPalette {
  if (!element || typeof window === "undefined") return FALLBACK;

  const styles = window.getComputedStyle(element);
  const read = (name: string, fallback: string) => {
    const value = styles.getPropertyValue(name).trim();
    // A `color-mix()` or `var()` that failed to resolve is not something
    // three.js can parse — fall back rather than throwing inside the render loop.
    return value.startsWith("#") || value.startsWith("rgb") ? value : fallback;
  };

  return {
    void: read("--world-void", FALLBACK.void),
    accent: read("--world-accent", FALLBACK.accent),
    light: read("--world-light", FALLBACK.light),
  };
}
