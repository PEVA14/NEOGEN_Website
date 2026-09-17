/**
 * SCREENING FREE TEXT — used by the policy, never by the parser.
 *
 * The parser only normalises what the visitor typed; whether a note may be
 * read by a model is a POLICY decision, and this is the test the policy uses.
 */

function fold(text: string): string {
  return text
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * PERSONAL AND HEALTH DETAIL IS NEVER SENT TO A MODEL.
 *
 * Atlas does not ask about bodies, conditions or medication, but the free-text
 * note invites goals in the visitor's own words, and those can volunteer them. When it does, the whole note is dropped on the
 * server before retrieval or generation — sensitive health data (datos
 * sensibles, in Mexican privacy law) is not something to forward to a third
 * party to improve a product recommendation, and a model that reads "I have
 * diabetes" is being invited to tailor to it.
 *
 * Deliberately broad. A false positive costs the reader one ignored sentence
 * and a visible notice; a false negative ships someone's diagnosis to an API.
 */
const HEALTH_PREFIXES: readonly string[] = [
  // es
  "diabet",
  "hipertens",
  "cancer",
  "tumor",
  "cardiac",
  "corazon",
  "tiroid",
  "renal",
  "rinon",
  "higado",
  "hepat",
  "embaraz",
  "lactan",
  "medicament",
  "farmac",
  "pastill",
  "insulin",
  "anticoagul",
  "antidepres",
  "psiquiatr",
  "hormon",
  "testosteron",
  "estrogen",
  "enfermedad",
  "sintoma",
  "dolor",
  "lesion",
  "cirug",
  "alergi",
  "diagnost",
  "tratamient",
  "inyec",
  "dosis",
  "ciclo",
  "adelgaz",
  "bajar de peso",
  "perder peso",
  "mi cuerpo",
  "me siento",
  "uso personal",
  // "para mí" alone is too broad now that the note invites goals — "para mi
  // siguiente pedido" is shopping, "para mi uso" is personal use.
  "para mi uso",
  "para mi mism",
  "para consumo",
  // everyday names for conditions — the plain phrase, not only the clinical stem
  "presion arterial",
  "presion alta",
  "colesterol",
  "glucos",
  "azucar en la sangre",
  "asma",
  "depresi",
  "ansiedad",
  "obesi",
  "sobrepeso",
  "artritis",
  "migra",
  "epilep",
  "hepatit",
  // en
  "hypertens",
  "heart",
  "thyroid",
  "kidney",
  "liver",
  "pregnan",
  "breastfeed",
  "medicat",
  "pill",
  "antidepress",
  "psychiatr",
  "estrogen",
  "disease",
  "symptom",
  "injur",
  "surger",
  "allerg",
  "diagnos",
  "treatment",
  "inject",
  "dose",
  "dosing",
  "cycle",
  "lose weight",
  "weight loss",
  "my body",
  "i feel",
  "i take",
  "personal use",
  "for myself",
  "blood pressure",
  "cholesterol",
  "blood sugar",
  "glucos",
  "asthma",
  "depress",
  "anxiety",
  "obes",
  "overweight",
  "arthritis",
  "migraine",
  "epilep",
  "hepatit",
];
/** Short words matched on both boundaries, so "pesos" is not "peso". */
const HEALTH_WORDS: readonly string[] = [
  "peso",
  "kg",
  "kilos",
  "imc",
  "edad",
  "anos",
  "weight",
  "lbs",
  "bmi",
  "age",
  "drug",
  "pain",
];

export function mentionsPersonalHealth(text: string): boolean {
  const folded = fold(text);
  if (HEALTH_PREFIXES.some((stem) => new RegExp(`(^|[^a-z])${escape(stem)}`).test(folded))) {
    return true;
  }
  return HEALTH_WORDS.some((word) =>
    new RegExp(`(^|[^a-z0-9])${escape(word)}($|[^a-z0-9])`).test(folded),
  );
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Collapse whitespace, strip control characters, cap the length. */
export function normaliseText(raw: string, max: number): string {
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
