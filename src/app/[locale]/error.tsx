"use client";

import { useEffect } from "react";

import { Container, Section } from "@/components/primitives";
import { Body, Heading } from "@/components/typography";
import { Button } from "@/components/ui";

/**
 * Route-level error boundary.
 *
 * Copy is inlined rather than read from the dictionary: this is a Client
 * Component that must render even when the server render failed, so it cannot
 * depend on an async dictionary fetch.
 *
 * TODO(pre-launch): wire `error` to a reporting service once one is chosen.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Section mode="quiet" aria-labelledby="error-title">
      <Container>
        <Heading level={1} id="error-title" size="3xl">
          Algo salió mal · Something went wrong
        </Heading>
        <Body className="mt-(--space-sm)">
          Ocurrió un error inesperado. Intenta de nuevo. · An unexpected error occurred. Please try
          again.
        </Body>
        <Button variant="secondary" onClick={reset} className="mt-(--space-lg)">
          Reintentar · Try again
        </Button>
      </Container>
    </Section>
  );
}
