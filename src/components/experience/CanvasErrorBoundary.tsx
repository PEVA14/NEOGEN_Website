"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Rendered instead of the canvas when the 3D layer throws. */
  fallback: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Keeps a 3D failure local.
 *
 * A driver crash, a lost WebGL context or a malformed GLB must degrade to the
 * static fallback — it must never take down the page, because the page carries
 * navigation and (later) commerce. MVP_SCOPE requires an explicit failure state
 * for 3D; this is it.
 *
 * A class component because React error boundaries have no hook equivalent.
 */
export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surfaced in development so a broken asset is obvious rather than silently
    // falling back. Production stays quiet: the user already has the fallback.
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[NEOGEN] 3D layer failed, falling back to static:",
        error,
        info.componentStack,
      );
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
