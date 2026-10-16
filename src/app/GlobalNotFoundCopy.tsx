"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import { isLocale, localeTags, type Locale } from "@/i18n/config";

export interface GlobalNotFoundStrings {
  title: string;
  body: string;
  backHome: string;
  products: string;
}

const link =
  "inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-(--tracking-label) text-(--ink-primary) underline underline-offset-4";

/**
 * The unmatched-address 404, in both languages with the address's own first
 * (B11): `/en/…` reads English, anything else Spanish. The page is static
 * and has no layout to tell it the language, so the server renders Spanish
 * and the browser switches by the path — through `useSyncExternalStore`,
 * whose server snapshot keeps hydration consistent (no mismatch). Without
 * JavaScript the page stays bilingual, Spanish first, as before.
 */
const never = () => () => {};
const fromPath = (): Locale => {
  const segment = window.location.pathname.split("/")[1] ?? "";
  return isLocale(segment) ? segment : "es";
};
export function GlobalNotFoundCopy({
  copy,
}: {
  copy: Readonly<Record<Locale, GlobalNotFoundStrings>>;
}) {
  const locale = useSyncExternalStore<Locale>(never, fromPath, () => "es");
  const other: Locale = locale === "en" ? "es" : "en";
  useEffect(() => {
    document.documentElement.lang = localeTags[locale];
  }, [locale]);
  const main = copy[locale];
  const second = copy[other];
  return (
    <>
      <div className="grid gap-(--space-sm) border-t border-(--border-strong) pt-(--space-md)">
        <p className="m-0 font-mono text-xs tracking-(--tracking-label) text-(--ink-muted) uppercase">
          404
        </p>
        <h1 className="neogen-display m-0 text-5xl leading-(--leading-tight)">{main.title}</h1>
        <p className="m-0 max-w-[48ch] text-lg text-(--ink-secondary)">{main.body}</p>
        <p lang={other} className="m-0 max-w-[48ch] text-sm text-(--ink-muted)">
          {second.title}. {second.body}
        </p>
      </div>
      <nav aria-label="NEOGEN" className="flex flex-wrap gap-x-(--space-lg) gap-y-(--space-2xs)">
        <Link href={`/${locale}/productos`} className={link}>
          {main.products} →
        </Link>
        <Link href={`/${locale}`} className={link}>
          {main.backHome}
        </Link>
        <Link href={`/${other}`} lang={other} className={link}>
          {other === "en" ? "English" : "Español"}
        </Link>
      </nav>
    </>
  );
}
