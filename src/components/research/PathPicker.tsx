"use client";

import Link from "next/link";
import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import styles from "./PathPicker.module.css";

export type PathId = "begin" | "explore" | "evaluate";

export interface PathDoor {
  href: string;
  title: string;
  body: string;
  /** A derived count or a short fact in mono — "63 términos", "5 pasos". */
  meta: string;
}

export interface PathEntry {
  id: PathId;
  letter: string;
  /** The reader's own words — "Soy nuevo en esto". */
  question: string;
  body: string;
  doors: readonly PathDoor[];
  /** Server-rendered extras for the panel — the explore path's search. */
  extra?: ReactNode;
}

/**
 * THREE READERS, ONE CHOICE — the Research hub's front door.
 *
 * The hub serves a first-time visitor, someone looking for one compound, and
 * someone checking where a claim comes from. Instead of three columns of
 * links read side by side, the reader picks the sentence that sounds like
 * them, and the page answers with that path's doors — each with the real
 * count of what is behind it. Picking another re-opens the panel; nothing
 * else on the page moves.
 *
 * A TABLIST, because that is what it is: one of three views of the same
 * question. Arrow keys move between the tiles, Home/End jump, and every panel
 * is in the server HTML (the unselected ones `hidden`), so the routes are
 * crawlable and a no-JS reader still gets the first path's doors. The only
 * motion is the tile glyph (decorative, removed under reduced motion) and a
 * short rise as a panel opens — interface feedback, kept but shortened.
 */
export function PathPicker({
  paths,
  label,
  initial = "begin",
}: {
  paths: readonly PathEntry[];
  /** Accessible name of the tablist — "Elige por dónde entrar". */
  label: string;
  initial?: PathId;
}) {
  const [active, setActive] = useState<PathId>(initial);
  const base = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = paths.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(paths[next].id);
    tabs.current[next]?.focus();
  };

  return (
    <div className={styles.picker}>
      <p className={styles.label} id={`${base}-label`}>
        {label}
      </p>
      <div role="tablist" aria-labelledby={`${base}-label`} className={styles.tiles}>
        {paths.map((path, index) => {
          const selected = path.id === active;
          return (
            <button
              key={path.id}
              ref={(el) => {
                tabs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${path.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${path.id}`}
              tabIndex={selected ? 0 : -1}
              className={styles.tile}
              data-path={path.id}
              onClick={() => setActive(path.id)}
              onKeyDown={(event) => onKey(event, index)}
            >
              <span className={styles.tileTop}>
                <span className={styles.letter}>{path.letter}</span>
                <Glyph id={path.id} />
              </span>
              <span className={styles.question}>{path.question}</span>
              <span className={styles.tileBody}>{path.body}</span>
              <span className={styles.open} aria-hidden="true">
                <span className={styles.openLine} />
                <span className={styles.openArrow}>↓</span>
              </span>
            </button>
          );
        })}
      </div>

      {paths.map((path) => (
        <div
          key={path.id}
          role="tabpanel"
          id={`${base}-panel-${path.id}`}
          aria-labelledby={`${base}-tab-${path.id}`}
          hidden={path.id !== active}
          className={styles.panel}
          data-path={path.id}
        >
          <ul className={styles.doors} data-count={path.doors.length}>
            {path.doors.map((door, i) => (
              <li key={door.href} className={styles.door} style={{ "--i": i } as CSSProperties}>
                <Link href={door.href} className={styles.doorLink}>
                  <span className={styles.doorMeta}>{door.meta}</span>
                  <span className={styles.doorTitle}>{door.title}</span>
                  <span className={styles.doorBody}>{door.body}</span>
                  <span className={styles.doorArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {path.extra ? <div className={styles.extra}>{path.extra}</div> : null}
        </div>
      ))}
    </div>
  );
}

/**
 * A small drawn sign per path, in the same line language as the area marks:
 * a chain being joined (learning the vocabulary), an index being scanned
 * (finding a compound), a citation being checked (the evidence). Decorative;
 * it animates only while its tile is hovered or selected.
 */
function Glyph({ id }: { id: PathId }) {
  if (id === "begin") {
    return (
      <span className={styles.glyph} data-glyph="chain" aria-hidden="true">
        <span data-motion="decorative" />
        <span data-motion="decorative" />
        <span data-motion="decorative" />
        <span data-motion="decorative" />
      </span>
    );
  }
  if (id === "explore") {
    return (
      <span className={styles.glyph} data-glyph="index" aria-hidden="true">
        <span data-motion="decorative" />
        <span data-motion="decorative" />
        <span data-motion="decorative" />
        <span data-motion="decorative" />
      </span>
    );
  }
  return (
    <span className={styles.glyph} data-glyph="cite" aria-hidden="true">
      <span className={styles.citeText}>[</span>
      <span className={styles.citeNumber} data-motion="decorative">
        01
      </span>
      <span className={styles.citeText}>]</span>
    </span>
  );
}
