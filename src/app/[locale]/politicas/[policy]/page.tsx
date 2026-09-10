import { notFound } from "next/navigation";

import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { Mono, Prose } from "@/components/typography";
import { routes } from "@/config/routes";
import { publicPolicies, publicPolicyBySlug } from "@/content";
import { isLocale, locales, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";

import type { Metadata } from "next";

/**
 * A POLICY DOCUMENT — and today, none of them.
 *
 * `publicPolicies()` returns only what is `approved` WITH text WITH an
 * approval date, and nothing satisfies all three: NEOGEN has no reviewed
 * Terms, Privacy notice, shipping policy, returns policy, quality statement,
 * research-use notice or medical disclaimer. So `generateStaticParams`
 * produces zero pages and every one of these URLs 404s.
 *
 * WHY A 404 RATHER THAN A "COMING SOON" PAGE. A customer who opens a Terms
 * link and finds a page has been told those are the terms. An empty policy
 * page, a placeholder, or a heading with a pending note under it are all
 * worse than the page not existing — the first two are misleading and the
 * third publishes an internal to-do to a customer on a legal surface.
 *
 * WHAT THIS ROUTE BUYS BEFORE THE TEXT EXISTS. The URL shape is settled, the
 * approval gate is enforced in code rather than by a reviewer's memory, and
 * the acknowledgement framework can already point at a policy id and be
 * refused if it is not approved. When counsel supplies text it lands in
 * `content/policies.ts` with a status change, and the page appears.
 *
 * NOTHING LINKS HERE YET, deliberately: the footer's Legal column is still
 * absent, because a heading with links to seven 404s reads as a broken build
 * rather than as candour.
 */
/**
 * ONLY THE APPROVED SLUGS EXIST — enforced at the ROUTING layer.
 *
 * `dynamicParams = false` means a segment not returned by
 * `generateStaticParams` is a 404 before this module runs at all. That is a
 * correctness fix, not a tightening: with dynamic params allowed, the route
 * rendered on demand, hit `notFound()`, and Next cached that render as an
 * ISR page — which it then served with a **200 OK** carrying not-found
 * content. A soft 404 on a legal URL is the worst of both worlds: crawlers
 * index it, and monitoring never sees the error.
 *
 * It is also the honest declaration for this route. The set of valid policies
 * is fully known at build time — it is whatever has cleared review — so there
 * is nothing for an on-demand render to discover.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  return locales.flatMap((locale) =>
    publicPolicies().map((policy) => ({ locale, policy: policy.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; policy: string }>;
}): Promise<Metadata> {
  const { locale, policy: slug } = await params;
  if (!isLocale(locale)) return {};
  const policy = publicPolicyBySlug(slug);
  if (!policy) return {};

  const dict = await getDictionary(locale);
  const title = dict.policies.titles[policy.id];
  const description = dict.policies.description.replace("{title}", title);

  return {
    title,
    description,
    ...socialMetadata({ locale, path: routes.policy(policy.slug), title, description }),
    alternates: alternates(locale, routes.policy(policy.slug)),
  };
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ locale: string; policy: string }>;
}) {
  const { locale, policy: slug } = await params;
  if (!isLocale(locale)) notFound();

  /* The gate. An unapproved policy is indistinguishable from a policy that
     does not exist, which is the correct answer to both. */
  const policy = publicPolicyBySlug(slug);
  if (!policy || !policy.body) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.policies;
  const approved = policy.approvedOn
    ? new Intl.DateTimeFormat(localeTags[locale], { dateStyle: "long" }).format(
        new Date(policy.approvedOn),
      )
    : null;

  return (
    <Section mode="quiet" aria-labelledby="policy-title">
      <Container width="prose">
        <SectionHeader
          index={copy.index}
          label={`${copy.label} // ${copy.qualifier}`}
          title={copy.titles[policy.id]}
          id="policy-title"
          as="h1"
        />

        {/* The approval date is part of the document, not metadata: a policy
            without one cannot be cited. */}
        {approved ? (
          <Mono size="2xs" className="block text-(--ink-muted)">
            {copy.approvedLabel} — {approved}
          </Mono>
        ) : null}

        <Prose>
          {policy.body[locale].map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </Prose>
      </Container>
    </Section>
  );
}
