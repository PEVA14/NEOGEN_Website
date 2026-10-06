import { prefersReducedMotion } from "@/lib/reducedMotion";

import { MARK_ARMS } from "./markGeometry";
import {
  ASSEMBLY,
  ASSEMBLY_MS,
  CATCH,
  REACH,
  EASE_REACH,
  EASE_REGISTER,
  EASE_TENSION,
  TENSION,
  type Phase,
} from "./markPhases";

/*
 * THE MARK'S TIMED MOVEMENTS — the two plays a gesture can cause.
 *
 *   assemble   from nothing: the hub registers, the four nodes register,
 *              each connection reaches from both ends and meets, clockwise
 *              from the top node, and each node is drawn a little toward the
 *              hub as its connection closes, then relaxes.
 *   reconnect  from the whole mark: the connections let go (each half
 *              withdraws into its own node), and reach again.
 *
 * `assemble` is the same table (`markPhases.ts`) the scroll-linked assembly
 * in NeogenMark.module.css runs on a timeline, here on a clock.
 *
 * Native Web Animations, no library: a handful of transforms on ten SVG
 * parts, each removed when it finishes, so the mark at rest is the artwork's
 * own geometry with nothing applied. A play never loops, and a second play
 * while one is running is ignored. Under reduced motion nothing plays — the
 * mark is simply whole.
 */

const running = new WeakSet<SVGSVGElement>();

type Part = "hub" | "node" | "in" | "out" | "sat";

function parts(svg: SVGSVGElement, part: Part): SVGElement[] {
  return Array.from(svg.querySelectorAll<SVGElement>(`[data-part="${part}"]`));
}

const axis = (angle: number, sx: number, sy: number) =>
  `rotate(${angle}deg) scale(${sx}, ${sy}) rotate(${-angle}deg)`;

function tension(angle: number): Keyframe[] {
  const ux = Math.cos((angle * Math.PI) / 180) * -TENSION;
  const uy = Math.sin((angle * Math.PI) / 180) * -TENSION;
  return [
    { translate: "0px 0px" },
    { translate: `${ux}px ${uy}px`, offset: 0.45 },
    { translate: "0px 0px" },
  ];
}

/** A phase on the clock: when it starts and how long it lasts. */
const timed = ([start, end]: Phase) => ({
  delay: start * ASSEMBLY_MS,
  duration: (end - start) * ASSEMBLY_MS,
});

function finish(svg: SVGSVGElement, animations: Animation[]): void {
  running.add(svg);
  void Promise.allSettled(animations.map((a) => a.finished)).then(() => running.delete(svg));
}

function allowed(svg: SVGSVGElement): boolean {
  if (running.has(svg)) return false;
  if (prefersReducedMotion()) return false;
  /* A mark still being assembled by the page's scroll is not whole yet:
     reconnecting it would show connections between nodes that are not there. */
  const hub = svg.querySelector('[data-part="hub"]');
  const scale = hub ? getComputedStyle(hub).scale : "none";
  return scale === "none" || scale === "1";
}

/**
 * `onContact(k)`: called the moment arm k's two halves meet (Living Ink
 * hands the contact to the material there). `catching`: the halves
 * reach as a thin thread and widen only once they touch — surface tension
 * catching — rather than arriving at full width.
 */
export function assemble(
  svg: SVGSVGElement,
  options: { catching?: boolean; onContact?: (k: number) => void } = {},
): Promise<void> {
  if (!allowed(svg)) return Promise.resolve();
  const register = [{ scale: 0 }, { scale: 1 }];
  const out: Animation[] = [];
  parts(svg, "hub").forEach((el) =>
    out.push(
      el.animate(register, { ...timed(ASSEMBLY.hub()), easing: EASE_REGISTER, fill: "backwards" }),
    ),
  );
  MARK_ARMS.forEach((arm, k) => {
    const node = parts(svg, "node")[k];
    const halves = [parts(svg, "in")[k], parts(svg, "out")[k]];
    const sat = parts(svg, "sat")[k];
    out.push(
      node.animate(register, {
        ...timed(ASSEMBLY.node(k)),
        easing: EASE_REGISTER,
        fill: "backwards",
      }),
    );
    for (const half of halves) {
      out.push(
        half.animate(
          options.catching
            ? catchFrames(arm.angle)
            : [
                { transform: axis(arm.angle, REACH.thread, REACH.girth) },
                { transform: axis(arm.angle, 1, 1) },
              ],
          {
            ...timed(ASSEMBLY.reach(k)),
            easing: options.catching ? "linear" : EASE_REACH,
            fill: "backwards",
          },
        ),
      );
    }
    if (options.onContact) {
      const [, end] = ASSEMBLY.reach(k);
      const contactAt =
        (end - (end - ASSEMBLY.reach(k)[0]) * (options.catching ? 1 - CATCH.contact : 0)) *
        ASSEMBLY_MS;
      window.setTimeout(() => options.onContact?.(k), contactAt);
    }
    out.push(
      sat.animate(tension(arm.angle), { ...timed(ASSEMBLY.tension(k)), easing: EASE_TENSION }),
    );
  });
  finish(svg, out);
  return Promise.allSettled(out.map((a) => a.finished)).then(() => undefined);
}

/**
 * A connection that CATCHES: it reaches as a thread (thinning as it
 * stretches), touches, and only then widens — a little past its width, and
 * back. The same frames the scroll-linked gathering uses
 * (`mark-reach-catch`, NeogenMark.module.css).
 */
function catchFrames(angle: number): Keyframe[] {
  return [
    {
      transform: axis(angle, REACH.thread, REACH.girth),
      easing: "cubic-bezier(.45,0,.3,1)",
    },
    {
      transform: axis(angle, 1, CATCH.thin),
      offset: CATCH.contact,
      easing: "cubic-bezier(.2,.7,.3,1)",
    },
    { transform: axis(angle, 1, CATCH.over), offset: CATCH.settle, easing: "ease-in-out" },
    { transform: axis(angle, 1, 1) },
  ];
}

export function reconnect(svg: SVGSVGElement): void {
  if (!allowed(svg)) return;
  const out: Animation[] = [];
  MARK_ARMS.forEach((arm, k) => {
    const halves = [parts(svg, "in")[k], parts(svg, "out")[k]];
    const sat = parts(svg, "sat")[k];
    const whole = axis(arm.angle, 1, 1);
    const apart = axis(arm.angle, REACH.thread, REACH.girth);
    for (const half of halves) {
      out.push(
        half.animate(
          [
            { transform: whole, easing: "cubic-bezier(.5,0,.9,.5)" },
            { transform: apart, offset: 0.3 },
            { transform: apart, offset: 0.38, easing: "cubic-bezier(.3,0,.2,1)" },
            { transform: whole },
          ],
          { duration: 470, delay: k * 40 },
        ),
      );
    }
    out.push(
      sat.animate(tension(arm.angle), { duration: 220, delay: 430 + k * 40, easing: EASE_TENSION }),
    );
  });
  /* Colour focuses, then returns: inside an area the mark answers in the
     area's mark colour and comes back to ink as it closes. */
  const tint = getComputedStyle(svg).getPropertyValue("--area-mark").trim();
  if (tint) {
    out.push(
      svg.animate(
        [
          { fill: "currentColor" },
          { fill: tint, offset: 0.2 },
          { fill: tint, offset: 0.7 },
          { fill: "currentColor" },
        ],
        { duration: 1000 },
      ),
    );
  }
  finish(svg, out);
}
