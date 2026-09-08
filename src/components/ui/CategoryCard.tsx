import { Body, Heading, Mono } from "@/components/typography";
import { TextLink } from "@/components/ui/TextLink";

interface CategoryCardProps {
  index: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}

/**
 * Discovery card — Quiet Mode.
 *
 * Zero-radius, 1px Chalk border, warm-stone surface against the paper page.
 * Structure and typography carry the hierarchy; there is no colour in it at
 * all, which is what keeps the three product worlds meaningful when they
 * arrive.
 */
export function CategoryCard({ index, title, body, href, linkLabel }: CategoryCardProps) {
  return (
    <article className="flex flex-col gap-(--space-md) border border-(--border-subtle) bg-(--surface-raised) p-(--space-lg)">
      <Mono size="2xs" tone="muted" className="tracking-(--tracking-label)">
        [ {index} ]
      </Mono>

      <Heading level={3} size="2xl">
        {title}
      </Heading>

      <Body className="flex-1">{body}</Body>

      <TextLink href={href}>{linkLabel}</TextLink>
    </article>
  );
}
