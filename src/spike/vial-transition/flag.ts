/**
 * SPIKE — "one object, many magnifications": catalogue card → product page.
 *
 * OFF unless the build is made with NEXT_PUBLIC_SPIKE_VIAL_TRANSITION=1. With
 * it off, every touch point in the app renders exactly what it rendered before
 * the spike: the flag is read at build time, so the spike's branches are dead
 * code in a normal build.
 *
 * See ./README.md for what it proves, how to run it, and how to remove it.
 */
export const VIAL_TRANSITION = process.env.NEXT_PUBLIC_SPIKE_VIAL_TRANSITION === "1";
