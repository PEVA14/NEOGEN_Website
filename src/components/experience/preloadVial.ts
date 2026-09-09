"use client";

import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Load and parse a vial GLB into the loader cache, ahead of being asked for it.
 *
 * WHY THIS EXISTS
 * ---------------
 * Opening a product page used to race three expensive things at once: the
 * three.js chunk evaluating, the GLB downloading and parsing, and the shaders
 * compiling — all on the main thread, all while an opening animation was trying
 * to run. The animation lost, and the result read as lag.
 *
 * Doing that work on INTENT instead — the moment a pointer settles on a product
 * card — means the click lands on a warm cache and the opening has the frame
 * budget to itself.
 *
 * Deliberately its own module so importing it is what pulls in three.js and the
 * loader. A static import would drag them into every page that renders a card.
 */
export function preloadVial(modelPath: string): void {
  useLoader.preload(GLTFLoader, modelPath);
}
