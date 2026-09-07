import { Container, Section } from "@/components/primitives";
import { Body, Display, Eyebrow } from "@/components/typography";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { notFound } from "next/navigation";

/**
 * HOME — Phase 1 SKELETON ONLY.
 *
 * The real homepage (Hero → What is NEOGEN → RETA cinematic → Explore → GLOW →
 * Research → Quality → GHK-Cu → Products → Footer) is NOT built here, and the
 * Hero + RETA 3D proof is Phase 2. This route exists so the structure is
 * navigable and the foundation is verifiable in a browser.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <Section mode="quiet" aria-labelledby="home-title">
      <Container>
        <Eyebrow>{dict.meta.tagline}</Eyebrow>
        <Display id="home-title" size="6xl" className="mt-(--space-sm)">
          {dict.home.title}
        </Display>
        <Body size="lg" className="mt-(--space-md) max-w-(--container-prose)">
          {dict.home.skeletonNote}
        </Body>
      </Container>
    </Section>
  );
}
