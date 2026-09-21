import type { DiscoveryAreaId } from "@/data/discovery/types";
import type { Locale } from "@/i18n/config";

/**
 * EDITORIAL — the shape of a NEOGEN note.
 *
 * WHY ARTICLES ARE STRUCTURED DATA AND NOT MDX. The `investigacion/[slug]`
 * route has carried a note since Phase 11 saying the authoring format was
 * still to be chosen between MDX and structured blocks. Blocks win here for
 * one reason that is specific to this project: NEOGEN's content rule is that
 * every public sentence can name what it rests on. A block carries its own
 * provenance and its own citations, so the gate can check an article the same
 * way it checks a product overview. MDX is a document with opinions about
 * markup; this is a document with opinions about evidence. It also needs no
 * new dependency, no compiler step and no second styling idiom.
 *
 * WHAT AN ARTICLE MAY SAY — the three classes below are narrower than the
 * five in `content/lifecycle.ts` on purpose. The lifecycle classes describe
 * claims about PRODUCTS. An editorial note mostly does something different:
 * it defines vocabulary and describes how NEOGEN works. Those are checkable
 * without a citation. The moment a note says something about what a compound
 * DOES, it is a `sourced` block and needs approved references, exactly like a
 * product overview — and without them it does not render.
 */
export type EditorialClass =
  /**
   * Terminology and definitions. What the word "peptide" means, what the
   * letters on a certificate of analysis stand for, what "lyophilised" means.
   * General vocabulary, true independently of NEOGEN and of any product, and
   * never a statement about what a compound does to anything.
   */
  | "definition"
  /**
   * How NEOGEN itself works: what it publishes, what it refuses to publish,
   * how an order is handled. Class A in lifecycle terms — the owner decided
   * it, and it is checkable against this repository.
   */
  | "practice"
  /**
   * A statement about what a compound does, or any scientific finding. Needs
   * `references`, resolved against the approved registry, or it does not
   * render. Nothing in the seeded notes uses this; it exists so that an
   * article CAN cite research rather than being tempted to imply it.
   */
  | "sourced";

/** Localized text. Both locales required, so no language silently falls back. */
export type LocalizedText = Readonly<Record<Locale, string>>;
export type LocalizedList = Readonly<Record<Locale, readonly string[]>>;

interface BlockBase {
  /** Stable within its article. Used as a React key and as a fragment target. */
  id: string;
  editorialClass: EditorialClass;
  /**
   * Reference ids from `content/references`. Required and non-empty for a
   * `sourced` block; ignored for the other two, which rest on nothing that a
   * citation could support.
   */
  references?: readonly string[];
}

/** A run of prose. One idea; the renderer sets it at reading measure. */
export interface ParagraphBlock extends BlockBase {
  kind: "paragraph";
  text: LocalizedText;
}

/** A subheading. Renders as an `h2` inside the article. */
export interface HeadingBlock extends BlockBase {
  kind: "heading";
  text: LocalizedText;
}

/** An unordered list of short statements. */
export interface ListBlock extends BlockBase {
  kind: "list";
  items: LocalizedList;
}

/**
 * A defined-term list — the shape most of this catalogue's vocabulary takes.
 * Renders as a real `<dl>`, which is what it is.
 */
export interface TermsBlock extends BlockBase {
  kind: "terms";
  terms: readonly { term: LocalizedText; definition: LocalizedText }[];
}

/**
 * A set-apart statement. Used for the research-use condition and for the
 * boundaries of what a note is NOT saying — the one place an article raises
 * its voice, and never for marketing.
 */
export interface NoteBlock extends BlockBase {
  kind: "note";
  text: LocalizedText;
}

export type ArticleBlock = ParagraphBlock | HeadingBlock | ListBlock | TermsBlock | NoteBlock;

/**
 * Editorial review status. Only `approved` reaches a reader, and the gate
 * proves it — same rule as every other content module in this codebase.
 */
export type ArticleStatus = "draft" | "owner-review" | "approved";

/**
 * What the note is about. Drives the index's grouping and the "related notes"
 * rail, and is a closed set so the editorial section cannot sprawl into
 * whatever the last writer felt like tagging.
 */
export type ArticleTopic =
  /** Vocabulary: what things are called and what the words mean. */
  | "vocabulary"
  /** Documentation: certificates, lots, what a record has to contain. */
  | "documentation"
  /** Laboratory practice: storage, handling, what a material needs. */
  | "handling"
  /** The research-use condition and what it means for a purchase. */
  | "research-use";

export interface Article {
  slug: string;
  topic: ArticleTopic;
  status: ArticleStatus;
  /**
   * ISO date. The date the text was approved, not the date a file changed —
   * it is printed, and it is what `<time dateTime>` carries.
   */
  publishedOn: string;
  /** Set only when approved text was materially revised. */
  updatedOn: string | null;
  title: LocalizedText;
  /** One sentence. The index entry, the meta description and the OG summary. */
  summary: LocalizedText;
  body: readonly ArticleBlock[];
  /**
   * Internal links out of the note, by product slug and by discovery area id.
   *
   * Resolved against the catalogue at render time, so a renamed product breaks
   * the build rather than publishing a dead link — and so an editorial note
   * can never invent a product that does not exist.
   */
  related: {
    products: readonly string[];
    /** Area IDS, not slugs — the same key the area dictionary is keyed by. */
    areas: readonly DiscoveryAreaId[];
  };
}
