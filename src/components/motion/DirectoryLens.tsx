"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { SpecimenPlate } from "@/components/ui/SpecimenPlate";
import { arm, useArmed } from "@/components/vial-transition/armed";
import { boxOf, markIncoming } from "@/components/vial-transition/incoming";
import { names, specimenFor } from "@/components/vial-transition/specimens";
import { REDUCED_MOTION_QUERY } from "@/lib/reducedMotion";

import styles from "./DirectoryLens.module.css";

import type { WorldId } from "@/config/worlds";
import type { DiscoveryAreaId } from "@/data/discovery";

/** What the lens needs to show one product: read off its directory link. */
interface Sample {
  slug: string;
  name: string;
  range: string;
  area: DiscoveryAreaId;
  world: WorldId | null;
}

/** How stiffly the lens follows the pointer, and how it is damped. */
const FOLLOW = { k: 260, c: 30 };
/** How far the specimen leans against the pointer's travel, and its settle. */
const SWAY = { gain: 0.012, max: 7, k: 120, c: 13 };

/**
 * THE DIRECTORY LOOKS BACK — the closing catalogue's specimen lens.
 *
 * The directory is the store at a glance: eighty-five names and prices, and
 * no pictures, by design (a grid of eighty-five cards is what it replaced).
 * But each name is an object. Moving down the list, a small window travels
 * beside the pointer holding the product the pointer is on — its studio
 * specimen where one exists, its drawn NEOGEN vial otherwise, label and range
 * printed on it as on the shelf — so the register of names is also a tray of
 * real things.
 *
 * Physical, not decorative: the window follows the pointer on a spring, and
 * the vial standing in it leans against the window's travel and settles, as
 * a vial on a moving tray would (the bench's lean, `ProductBench`, from the
 * other side). Moving to another name swaps the specimen in the direction the
 * pointer went — down the list, the next one comes up from below.
 *
 * Fine pointers only: on touch the names are links, as before. Keyboard
 * focus docks the window beside the focused name. It is aria-hidden — the
 * link already says everything the picture shows. Reduced motion: the window
 * goes where it is needed without following or leaning.
 *
 * `travel` (the product page's catalogue directory): choosing a name sends
 * the drawn vial in the window on to its product page, as a card sends its
 * own — the catalogue's specimen flight, from a register instead of a grid.
 * Only a drawn vial travels (a studio specimen keeps its world's own
 * arrival), and only when the window is showing it. The window rides beside
 * the nearest `[data-lens-column]`, else the nearest section.
 */
export function DirectoryLens({
  children,
  className,
  travel = false,
}: {
  children: ReactNode;
  className?: string;
  travel?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  /* The specimen in the window, and the one it is replacing (for its exit). */
  const [samples, setSamples] = useState<{ item: Sample; dir: 1 | -1; n: number }[]>([]);

  useEffect(() => {
    const node = root.current;
    const box = lens.current;
    if (!node || !box) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = window.matchMedia(REDUCED_MOTION_QUERY);

    const W = 168;
    const H = 210;
    let goal = { x: 0, y: 0 };
    let pos = { x: 0, y: 0 };
    let vel = { x: 0, y: 0 };
    let sway = 0;
    let swayVel = 0;
    let open = false;
    let frame = 0;
    let last = 0;
    let current: HTMLElement | null = null;
    let lastY = 0;

    const write = () => {
      box.style.translate = `${pos.x}px ${pos.y}px`;
      box.style.setProperty("--sway", `${sway.toFixed(2)}deg`);
    };
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
      last = now;
      const ax = FOLLOW.k * (goal.x - pos.x) - FOLLOW.c * vel.x;
      const ay = FOLLOW.k * (goal.y - pos.y) - FOLLOW.c * vel.y;
      vel = { x: vel.x + ax * dt, y: vel.y + ay * dt };
      pos = { x: pos.x + vel.x * dt, y: pos.y + vel.y * dt };
      /* The vial leans back against the tray's acceleration. */
      const target = Math.max(-SWAY.max, Math.min(SWAY.max, -vel.x * SWAY.gain));
      const as = SWAY.k * (target - sway) - SWAY.c * swayVel;
      swayVel += as * dt;
      sway += swayVel * dt;
      write();
      const moving =
        Math.abs(goal.x - pos.x) + Math.abs(goal.y - pos.y) > 0.3 ||
        Math.abs(vel.x) + Math.abs(vel.y) > 2 ||
        Math.abs(sway) + Math.abs(swayVel) > 0.05;
      frame = moving ? requestAnimationFrame(tick) : 0;
    };
    const run = () => {
      if (still.matches) {
        pos = { ...goal };
        sway = 0;
        write();
        return;
      }
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    /*
     * Beside the COLUMN the pointer is in, not the pointer: the window rides
     * up and down the column's outer edge, so it never covers the name or the
     * price being read (it lies over the next column instead), and moving to
     * another column carries it across like a carriage.
     */
    /* Column boxes, read once per column until the page scrolls (which hides
       the lens anyway) — not on every pointer move. */
    const columns = new Map<Element, DOMRect>();
    const aim = (link: HTMLElement, y: number) => {
      const section = link.closest("[data-lens-column]") ?? link.closest("section") ?? link;
      let column = columns.get(section);
      if (!column) {
        column = section.getBoundingClientRect();
        columns.set(section, column);
      }
      const right = column.right + 16 + W < window.innerWidth - 8;
      goal = {
        x: right ? column.right + 16 : column.left - 16 - W,
        y: Math.min(window.innerHeight - H - 8, Math.max(8, y - H / 2)),
      };
    };

    const sampleOf = (link: HTMLElement): Sample | null => {
      const d = link.dataset;
      if (!d.lensSlug || !d.lensArea) return null;
      return {
        slug: d.lensSlug,
        name: d.lensName ?? "",
        range: d.lensRange ?? "",
        area: d.lensArea as DiscoveryAreaId,
        world: (d.lensWorld as WorldId | undefined) ?? null,
      };
    };

    const pick = (link: HTMLElement, y: number) => {
      if (link === current) return;
      const item = sampleOf(link);
      if (!item) return;
      const dir: 1 | -1 = y >= lastY ? 1 : -1;
      current = link;
      setSamples((list) => {
        const top = list.at(-1);
        const next = { item, dir, n: (top?.n ?? 0) + 1 };
        return top ? [{ ...top, dir }, next] : [next];
      });
    };

    const show = (link: HTMLElement, y: number, jump: boolean) => {
      aim(link, y);
      if (!open || jump) {
        pos = { ...goal };
        vel = { x: 0, y: 0 };
        write();
      }
      open = true;
      box.dataset.open = "true";
      run();
    };
    const hide = () => {
      columns.clear();
      open = false;
      current = null;
      box.dataset.open = "false";
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && !fine.matches) return;
      const link = (event.target as HTMLElement).closest<HTMLElement>("[data-lens-slug]");
      if (!link) {
        if (open && !(event.target as HTMLElement).closest("li")) hide();
        return;
      }
      pick(link, event.clientY);
      lastY = event.clientY;
      show(link, event.clientY, false);
    };
    const focus = (event: FocusEvent) => {
      const link = (event.target as HTMLElement).closest<HTMLElement>("[data-lens-slug]");
      if (!link || !link.matches(":focus-visible")) return;
      const r = link.getBoundingClientRect();
      lastY = r.top;
      pick(link, r.top + 1);
      show(link, r.top + r.height / 2, !open);
    };

    /* The vial in the window leaves for the page it names. */
    const click = (event: MouseEvent) => {
      if (!travel || !open || event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
        return;
      const link = (event.target as HTMLElement).closest<HTMLElement>("[data-lens-slug]");
      const slug = link?.dataset.lensSlug;
      if (!link || !slug || link !== current || specimenFor(slug)) return;
      const plate = box.querySelector(`[data-lens-sample="${slug}"]:not([data-leaving])`);
      if (!plate) return;
      arm(`lens:${slug}`);
      markIncoming(slug, boxOf(box), boxOf(plate));
    };

    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", hide);
    node.addEventListener("focusin", focus);
    node.addEventListener("focusout", hide);
    node.addEventListener("click", click);
    window.addEventListener("scroll", hide, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("click", click);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", hide);
      node.removeEventListener("focusin", focus);
      node.removeEventListener("focusout", hide);
      window.removeEventListener("scroll", hide);
    };
  }, [travel]);

  return (
    <div ref={root} className={className}>
      {children}
      <div ref={lens} className={styles.lens} aria-hidden="true" data-open="false">
        {samples.map((sample, i) => {
          const specimen = specimenFor(sample.item.slug);
          return (
            <div
              key={sample.n}
              className={styles.sample}
              data-dir={sample.dir}
              data-leaving={i < samples.length - 1 ? "true" : undefined}
              data-world={sample.item.world ?? undefined}
              data-lens-sample={sample.item.slug}
            >
              {specimen ? (
                <div className={styles.studio}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- the card's own cut-outs, already cached */}
                  <img src={specimen.ground} alt="" className={styles.ground} />
                  {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
                  <img
                    src={specimen.specimen}
                    alt=""
                    className={styles.object}
                    style={{
                      left: `${specimen.box.x * 100}%`,
                      top: `${specimen.box.y * 100}%`,
                      width: `${specimen.box.w * 100}%`,
                      height: `${specimen.box.h * 100}%`,
                    }}
                  />
                </div>
              ) : (
                <LensPlate item={sample.item} travel={travel && i === samples.length - 1} />
              )}
            </div>
          );
        })}
        <span className={styles.corner} data-corner="tl" />
        <span className={styles.corner} data-corner="br" />
      </div>
    </div>
  );
}

/**
 * The drawn vial in the window. Named for the flight only once its name has
 * been chosen (`armed.ts`): a view-transition name must be unique on the page,
 * and the same product can stand in the window and elsewhere.
 */
function LensPlate({ item, travel }: { item: Sample; travel: boolean }) {
  const armed = useArmed(`lens:${item.slug}`);
  return (
    <SpecimenPlate
      areaId={item.area}
      world={item.world}
      name={item.name}
      annotation={item.range}
      size="card"
      travel={travel ? (armed ? names.specimen(item.slug) : "auto") : null}
    />
  );
}
