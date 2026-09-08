/**
 * The set of tags a DOM primitive is allowed to render.
 *
 * WHY THIS EXISTS
 * ---------------
 * `@react-three/fiber` augments the global JSX namespace:
 *
 *   declare module 'react' {
 *     namespace JSX { interface IntrinsicElements extends ThreeElements {} }
 *   }
 *
 * That augmentation is project-wide and cannot be scoped to the 3D layer. It
 * widens React's `ElementType` to include every three.js object, so a
 * polymorphic `as?: ElementType` prop ends up intersecting DOM props with
 * three.js props and collapsing to `never`.
 *
 * Narrowing to real HTML tags fixes that — and is more correct regardless:
 * `Container`, `Section`, `Stack`, `Text` and `VisuallyHidden` are Quiet Mode
 * DOM primitives. They must never render a `<mesh>`. 3D lives exclusively in
 * `src/components/experience/` (CONVENTIONS §2).
 */
export type DOMTag = keyof HTMLElementTagNameMap;
