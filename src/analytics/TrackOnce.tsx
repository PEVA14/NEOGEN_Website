"use client";

import { useEffect } from "react";

import { track } from "./client";

import type { FunnelEvent } from "./events";

/** Fire one event when a page mounts — a product view. Renders nothing. */
export function TrackOnce({ event }: { event: FunnelEvent }) {
  const key = JSON.stringify(event);
  useEffect(() => {
    track(JSON.parse(key) as FunnelEvent);
  }, [key]);
  return null;
}
