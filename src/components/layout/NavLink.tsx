"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { ReactNode } from "react";

/**
 * A HEADER LINK THAT KNOWS WHERE YOU ARE (Research architecture pass,
 * 2026-10-05). Inside a section — any page under its path — the link is
 * marked `aria-current` ("page" on the section's own page, "true" below it),
 * and the header styles it by weight and underline, never by colour.
 */
export function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const current = pathname === href ? "page" : pathname.startsWith(`${href}/`) ? "true" : undefined;
  return (
    <Link href={href} className={className} aria-current={current}>
      {children}
    </Link>
  );
}
