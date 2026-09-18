import type { AtlasQuestionnaire } from "@/domain/atlas/questionnaire";

/**
 * ATLAS QUESTIONNAIRE — adapted from Questionnaire.docx.
 * Edit labels and options here in Spanish and English. Array order is display order.
 * Keep IDs stable; bump version when a change invalidates existing saved answers.
 *
 * Goal details appear inline through visibleWhen; a separate option sheet would
 * require a renderer change outside this content file.
 *
 * The document names six dropdowns without supplying their choices. Editable
 * defaults were added for training-type, injection-tolerance, daily-schedule,
 * work-type, alcohol and caffeine. They use the existing single-select display.
 *
 * These new answers have no advisor roles assigned. Connecting them to
 * recommendation logic is a separate system change.
 */
export const ATLAS_QUESTIONNAIRE: AtlasQuestionnaire = {
  version: "4",
  groups: [
    {
      id: "goals",
      label: {
        es: "Objetivos",
        en: "Goals"
      },
      title: {
        es: "Objetivos",
        en: "Goals"
      },
      lede: {
        es: "Selecciona tu objetivo y después lo que más te interesa.",
        en: "Select your goal, then what interests you most."
      },
      questions: [
        {
          id: "goal",
          kind: "single-select",
          label: {
            es: "¿Cuál es tu objetivo?",
            en: "What is your goal?"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "weight-loss",
                label: {
                  es: "Pérdida de peso",
                  en: "Weight loss"
                }
              },
              {
                id: "body-composition",
                label: {
                  es: "Composición corporal",
                  en: "Body composition"
                }
              },
              {
                id: "longevity",
                label: {
                  es: "Longevidad y salud celular",
                  en: "Longevity and cellular health"
                }
              },
              {
                id: "tissue-recovery",
                label: {
                  es: "Recuperación y reparación tisular",
                  en: "Recovery and tissue repair"
                }
              },
              {
                id: "sleep",
                label: {
                  es: "Sueño y descanso",
                  en: "Sleep and rest"
                }
              },
              {
                id: "cognition",
                label: {
                  es: "Función cognitiva",
                  en: "Cognitive function"
                }
              },
              {
                id: "skin-hair",
                label: {
                  es: "Piel y cabello",
                  en: "Skin and hair"
                }
              },
              {
                id: "sexual-health",
                label: {
                  es: "Libido y salud sexual",
                  en: "Libido and sexual health"
                }
              },
              {
                id: "daily-wellbeing",
                label: {
                  es: "Bienestar y rendimiento diario",
                  en: "Daily wellbeing and performance"
                }
              },
              {
                id: "immunity",
                label: {
                  es: "Inmunidad e inflamación",
                  en: "Immunity and inflammation"
                }
              }
            ]
          },
          required: true,
          recap: true
        },
        {
          id: "goal-weight-loss",
          kind: "single-select",
          label: {
            es: "¿Qué te interesa más?",
            en: "What interests you most?"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "satiety",
                label: {
                  es: "Saciedad y control del apetito",
                  en: "Satiety and appetite control"
                }
              },
              {
                id: "cravings",
                label: {
                  es: "Control de antojos",
                  en: "Craving control"
                }
              },
              {
                id: "energy-metabolism",
                label: {
                  es: "Metabolismo energético",
                  en: "Energy metabolism"
                }
              },
              {
                id: "insulin-sensitivity",
                label: {
                  es: "Sensibilidad a la insulina",
                  en: "Insulin sensitivity"
                }
              },
              {
                id: "visceral-fat",
                label: {
                  es: "Reducción de grasa visceral",
                  en: "Visceral fat reduction"
                }
              },
              {
                id: "lean-mass",
                label: {
                  es: "Preservación de masa magra",
                  en: "Lean mass preservation"
                }
              }
            ]
          },
          shortLabel: {
            es: "Pérdida de peso",
            en: "Weight loss"
          },
          visibleWhen: {
            question: "goal",
            equals: "weight-loss"
          },
          recap: true
        },
        {
          id: "goal-body-composition",
          kind: "single-select",
          label: {
            es: "¿Qué te interesa más?",
            en: "What interests you most?"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "hypertrophy",
                label: {
                  es: "Hipertrofia y masa muscular",
                  en: "Hypertrophy and muscle mass"
                }
              },
              {
                id: "strength",
                label: {
                  es: "Fuerza",
                  en: "Strength"
                }
              },
              {
                id: "session-recovery",
                label: {
                  es: "Recuperación entre sesiones",
                  en: "Recovery between sessions"
                }
              },
              {
                id: "muscular-endurance",
                label: {
                  es: "Resistencia muscular",
                  en: "Muscular endurance"
                }
              },
              {
                id: "protein-synthesis",
                label: {
                  es: "Síntesis proteica",
                  en: "Protein synthesis"
                }
              },
              {
                id: "gh-igf1",
                label: {
                  es: "Vías relacionadas con GH e IGF-1",
                  en: "GH- and IGF-1-related pathways"
                }
              }
            ]
          },
          shortLabel: {
            es: "Composición corporal",
            en: "Body composition"
          },
          visibleWhen: {
            question: "goal",
            equals: "body-composition"
          },
          recap: true
        },
        {
          id: "goal-longevity",
          kind: "single-select",
          label: {
            es: "¿Qué te interesa más?",
            en: "What interests you most?"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "mitochondria",
                label: {
                  es: "Salud mitocondrial",
                  en: "Mitochondrial health"
                }
              },
              {
                id: "cellular-repair",
                label: {
                  es: "Reparación y mantenimiento celular",
                  en: "Cellular repair and maintenance"
                }
              },
              {
                id: "oxidative-stress",
                label: {
                  es: "Estrés oxidativo",
                  en: "Oxidative stress"
                }
              },
              {
                id: "inflammation",
                label: {
                  es: "Regulación de la inflamación",
                  en: "Inflammation regulation"
                }
              },
              {
                id: "cellular-energy",
                label: {
                  es: "Metabolismo y energía celular",
                  en: "Cellular metabolism and energy"
                }
              },
              {
                id: "cellular-aging",
                label: {
                  es: "Envejecimiento celular saludable",
                  en: "Healthy cellular aging"
                }
              }
            ]
          },
          shortLabel: {
            es: "Longevidad y salud celular",
            en: "Longevity and cellular health"
          },
          visibleWhen: {
            question: "goal",
            equals: "longevity"
          },
          recap: true
        },
        {
          id: "goal-tissue-recovery",
          kind: "single-select",
          label: {
            es: "¿Qué te interesa más?",
            en: "What interests you most?"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "muscle-recovery",
                label: {
                  es: "Recuperación muscular",
                  en: "Muscle recovery"
                }
              },
              {
                id: "tendons",
                label: {
                  es: "Salud de tendones",
                  en: "Tendon health"
                }
              },
              {
                id: "ligaments",
                label: {
                  es: "Salud de ligamentos",
                  en: "Ligament health"
                }
              },
              {
                id: "joints",
                label: {
                  es: "Salud articular",
                  en: "Joint health"
                }
              },
              {
                id: "tissue-repair",
                label: {
                  es: "Cicatrización y reparación de tejidos",
                  en: "Wound healing and tissue repair"
                }
              },
              {
                id: "postoperative",
                label: {
                  es: "Recuperación postoperatoria",
                  en: "Postoperative recovery"
                }
              }
            ]
          },
          shortLabel: {
            es: "Recuperación y reparación tisular",
            en: "Recovery and tissue repair"
          },
          visibleWhen: {
            question: "goal",
            equals: "tissue-recovery"
          },
          recap: true
        },
        {
          id: "goal-sleep",
          kind: "single-select",
          label: {
            es: "¿Qué te interesa más?",
            en: "What interests you most?"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "falling-asleep",
                label: {
                  es: "Conciliar el sueño",
                  en: "Falling asleep"
                }
              },
              {
                id: "staying-asleep",
                label: {
                  es: "Mantener el sueño",
                  en: "Staying asleep"
                }
              },
              {
                id: "deep-sleep",
                label: {
                  es: "Sueño profundo",
                  en: "Deep sleep"
                }
              },
              {
                id: "circadian-rhythm",
                label: {
                  es: "Ritmo circadiano",
                  en: "Circadian rhythm"
                }
              },
              {
                id: "restorative-rest",
                label: {
                  es: "Descanso reparador",
                  en: "Restorative rest"
                }
              },
              {
                id: "bedtime-relaxation",
                label: {
                  es: "Relajación antes de dormir",
                  en: "Relaxation before bed"
                }
              }
            ]
          },
          shortLabel: {
            es: "Sueño y descanso",
            en: "Sleep and rest"
          },
          visibleWhen: {
            question: "goal",
            equals: "sleep"
          },
          recap: true
        },
        {
          id: "goal-cognition",
          kind: "single-select",
          label: {
            es: "¿Qué te interesa más?",
            en: "What interests you most?"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "memory",
                label: {
                  es: "Memoria",
                  en: "Memory"
                }
              },
              {
                id: "focus",
                label: {
                  es: "Enfoque y concentración",
                  en: "Focus and concentration"
                }
              },
              {
                id: "mental-clarity",
                label: {
                  es: "Claridad mental",
                  en: "Mental clarity"
                }
              },
              {
                id: "learning",
                label: {
                  es: "Aprendizaje y neuroplasticidad",
                  en: "Learning and neuroplasticity"
                }
              },
              {
                id: "stress-anxiety",
                label: {
                  es: "Manejo del estrés y ansiedad",
                  en: "Stress and anxiety management"
                }
              },
              {
                id: "neuroprotection",
                label: {
                  es: "Neuroprotección",
                  en: "Neuroprotection"
                }
              }
            ]
          },
          shortLabel: {
            es: "Función cognitiva",
            en: "Cognitive function"
          },
          visibleWhen: {
            question: "goal",
            equals: "cognition"
          },
          recap: true
        },
        {
          id: "goal-skin-hair",
          kind: "single-select",
          label: {
            es: "¿Qué te interesa más?",
            en: "What interests you most?"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "elasticity",
                label: {
                  es: "Elasticidad y firmeza",
                  en: "Elasticity and firmness"
                }
              },
              {
                id: "wrinkles",
                label: {
                  es: "Arrugas y líneas de expresión",
                  en: "Wrinkles and expression lines"
                }
              },
              {
                id: "skin-repair",
                label: {
                  es: "Cicatrización y reparación cutánea",
                  en: "Wound healing and skin repair"
                }
              },
              {
                id: "hair-growth",
                label: {
                  es: "Crecimiento y salud capilar",
                  en: "Hair growth and health"
                }
              },
              {
                id: "skin-tone",
                label: {
                  es: "Tono y apariencia de la piel",
                  en: "Skin tone and appearance"
                }
              },
              {
                id: "skin-texture",
                label: {
                  es: "Textura de la piel",
                  en: "Skin texture"
                }
              },
              {
                id: "pigmentation",
                label: {
                  es: "Pigmentación y melanogénesis",
                  en: "Pigmentation and melanogenesis"
                }
              }
            ]
          },
          shortLabel: {
            es: "Piel y cabello",
            en: "Skin and hair"
          },
          visibleWhen: {
            question: "goal",
            equals: "skin-hair"
          },
          recap: true
        },
        {
          id: "goal-sexual-health",
          kind: "single-select",
          label: {
            es: "¿Qué te interesa más?",
            en: "What interests you most?"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "libido",
                label: {
                  es: "Libido y deseo sexual",
                  en: "Libido and sexual desire"
                }
              },
              {
                id: "arousal",
                label: {
                  es: "Excitación y respuesta sexual",
                  en: "Arousal and sexual response"
                }
              },
              {
                id: "erectile-function",
                label: {
                  es: "Función eréctil",
                  en: "Erectile function"
                }
              },
              {
                id: "satisfaction",
                label: {
                  es: "Satisfacción sexual",
                  en: "Sexual satisfaction"
                }
              },
              {
                id: "sexual-wellbeing",
                label: {
                  es: "Bienestar sexual",
                  en: "Sexual wellbeing"
                }
              },
              {
                id: "intimacy",
                label: {
                  es: "Intimidad y conexión",
                  en: "Intimacy and connection"
                }
              }
            ]
          },
          shortLabel: {
            es: "Libido y salud sexual",
            en: "Libido and sexual health"
          },
          visibleWhen: {
            question: "goal",
            equals: "sexual-health"
          },
          recap: true
        },
        {
          id: "goal-daily-wellbeing",
          kind: "single-select",
          label: {
            es: "¿Qué te interesa más?",
            en: "What interests you most?"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "vitality",
                label: {
                  es: "Energía y vitalidad",
                  en: "Energy and vitality"
                }
              },
              {
                id: "stress-resilience",
                label: {
                  es: "Resistencia al estrés",
                  en: "Stress resilience"
                }
              },
              {
                id: "mood",
                label: {
                  es: "Estado de ánimo",
                  en: "Mood"
                }
              },
              {
                id: "energy-metabolism",
                label: {
                  es: "Metabolismo energético",
                  en: "Energy metabolism"
                }
              },
              {
                id: "general-recovery",
                label: {
                  es: "Recuperación general",
                  en: "General recovery"
                }
              },
              {
                id: "everyday-wellbeing",
                label: {
                  es: "Bienestar cotidiano",
                  en: "Everyday wellbeing"
                }
              }
            ]
          },
          shortLabel: {
            es: "Bienestar y rendimiento diario",
            en: "Daily wellbeing and performance"
          },
          visibleWhen: {
            question: "goal",
            equals: "daily-wellbeing"
          },
          recap: true
        },
        {
          id: "goal-immunity",
          kind: "single-select",
          label: {
            es: "¿Qué te interesa más?",
            en: "What interests you most?"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "immune-response",
                label: {
                  es: "Regulación de la respuesta inmune",
                  en: "Immune response regulation"
                }
              },
              {
                id: "inflammation",
                label: {
                  es: "Modulación de la inflamación",
                  en: "Inflammation modulation"
                }
              },
              {
                id: "innate-immunity",
                label: {
                  es: "Inmunidad innata",
                  en: "Innate immunity"
                }
              },
              {
                id: "physiological-stress",
                label: {
                  es: "Recuperación frente al estrés fisiológico",
                  en: "Recovery from physiological stress"
                }
              },
              {
                id: "intestinal-barrier",
                label: {
                  es: "Salud de la barrera intestinal",
                  en: "Intestinal barrier health"
                }
              },
              {
                id: "immune-balance",
                label: {
                  es: "Equilibrio inmunitario",
                  en: "Immune balance"
                }
              }
            ]
          },
          shortLabel: {
            es: "Inmunidad e inflamación",
            en: "Immunity and inflammation"
          },
          visibleWhen: {
            question: "goal",
            equals: "immunity"
          },
          recap: true
        }
      ]
    },
    {
      id: "you",
      label: {
        es: "Sobre ti",
        en: "About you"
      },
      title: {
        es: "Sobre ti",
        en: "About you"
      },
      lede: {
        es: "Cuéntanos sobre ti y tu experiencia.",
        en: "Tell us about yourself and your experience."
      },
      questions: [
        {
          id: "age",
          kind: "single-select",
          label: {
            es: "Edad",
            en: "Age"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "18-25",
                label: {
                  es: "18–25",
                  en: "18–25"
                }
              },
              {
                id: "26-35",
                label: {
                  es: "26–35",
                  en: "26–35"
                }
              },
              {
                id: "36-45",
                label: {
                  es: "36–45",
                  en: "36–45"
                }
              },
              {
                id: "46-55",
                label: {
                  es: "46–55",
                  en: "46–55"
                }
              },
              {
                id: "56-65",
                label: {
                  es: "56–65",
                  en: "56–65"
                }
              },
              {
                id: "65+",
                label: {
                  es: "65+",
                  en: "65+"
                }
              }
            ]
          }
        },
        {
          id: "biological-sex",
          kind: "single-select",
          label: {
            es: "Sexo biológico",
            en: "Biological sex"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "male",
                label: {
                  es: "Masculino",
                  en: "Male"
                }
              },
              {
                id: "female",
                label: {
                  es: "Femenino",
                  en: "Female"
                }
              },
              {
                id: "undisclosed",
                label: {
                  es: "Prefiero no decir",
                  en: "Prefer not to say"
                }
              }
            ]
          }
        },
        {
          id: "weight-kg",
          kind: "number",
          label: {
            es: "Peso (kg)",
            en: "Weight (kg)"
          },
          min: 1,
          step: 0.1
        },
        {
          // Document requirement: display automatically calculated IMC / BMI
          // after height: weight-kg / (height-cm / 100) ** 2.
          // TODO: implement a derived, read-only result in the renderer; the
          // existing content schema has no calculated field kind.
          id: "height-cm",
          kind: "number",
          label: {
            es: "Altura (cm)",
            en: "Height (cm)"
          },
          min: 1,
          step: 0.1
        },
        {
          id: "physical-activity",
          kind: "single-select",
          label: {
            es: "Actividad física",
            en: "Physical activity"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "sedentary",
                label: {
                  es: "Sedentario",
                  en: "Sedentary"
                }
              },
              {
                id: "light",
                label: {
                  es: "Ligera",
                  en: "Light"
                }
              },
              {
                id: "moderate",
                label: {
                  es: "Moderada",
                  en: "Moderate"
                }
              },
              {
                id: "very-active",
                label: {
                  es: "Muy activo",
                  en: "Very active"
                }
              },
              {
                id: "athlete",
                label: {
                  es: "Atleta",
                  en: "Athlete"
                }
              }
            ]
          }
        },
        {
          id: "sleep-quality",
          kind: "single-select",
          label: {
            es: "Calidad de sueño",
            en: "Sleep quality"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "excellent",
                label: {
                  es: "Excelente",
                  en: "Excellent"
                }
              },
              {
                id: "good",
                label: {
                  es: "Buena",
                  en: "Good"
                }
              },
              {
                id: "fair",
                label: {
                  es: "Regular",
                  en: "Fair"
                }
              },
              {
                id: "poor",
                label: {
                  es: "Mala",
                  en: "Poor"
                }
              },
              {
                id: "very-poor",
                label: {
                  es: "Muy mala",
                  en: "Very poor"
                }
              }
            ]
          }
        },
        {
          id: "stress",
          kind: "single-select",
          label: {
            es: "Estrés",
            en: "Stress"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "low",
                label: {
                  es: "Bajo",
                  en: "Low"
                }
              },
              {
                id: "moderate",
                label: {
                  es: "Moderado",
                  en: "Moderate"
                }
              },
              {
                id: "high",
                label: {
                  es: "Alto",
                  en: "High"
                }
              },
              {
                id: "very-high",
                label: {
                  es: "Muy alto",
                  en: "Very high"
                }
              }
            ]
          }
        },
        {
          id: "peptide-experience",
          kind: "single-select",
          label: {
            es: "Experiencia con péptidos",
            en: "Experience with peptides"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "none",
                label: {
                  es: "Sin experiencia — Primera vez con péptidos",
                  en: "No experience — First time with peptides"
                }
              },
              {
                id: "beginner",
                label: {
                  es: "Principiante — He usado 1–2 compuestos",
                  en: "Beginner — I have used 1–2 compounds"
                }
              },
              {
                id: "intermediate",
                label: {
                  es: "Intermedio — Experiencia con varios compuestos",
                  en: "Intermediate — Experience with several compounds"
                }
              },
              {
                id: "advanced",
                label: {
                  es: "Avanzado — Usuario experimentado",
                  en: "Advanced — Experienced user"
                }
              }
            ]
          }
        },
        {
          id: "previous-compounds",
          kind: "long-text",
          label: {
            es: "¿Cuáles has usado?",
            en: "Which ones have you used?"
          },
          markOptional: true,
          maxLength: 400,
          placeholder: {
            es: "BPC-157, Retatrutida…",
            en: "BPC-157, Retatrutide…"
          },
          visibleWhen: {
            any: [
              {
                question: "peptide-experience",
                equals: "beginner"
              },
              {
                question: "peptide-experience",
                equals: "intermediate"
              },
              {
                question: "peptide-experience",
                equals: "advanced"
              }
            ]
          }
        },
        {
          id: "administration-route",
          kind: "single-select",
          label: {
            es: "Vía de administración preferida",
            en: "Preferred route of administration"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "subcutaneous",
                label: {
                  es: "Subcutánea — Vía subcutánea",
                  en: "Subcutaneous — Subcutaneous route"
                }
              },
              {
                id: "oral",
                label: {
                  es: "Oral — Cápsulas o sublingual",
                  en: "Oral — Capsules or sublingual"
                }
              },
              {
                id: "topical",
                label: {
                  es: "Tópica — Aplicación tópica",
                  en: "Topical — Topical application"
                }
              },
              {
                id: "any",
                label: {
                  es: "Cualquiera — Sin preferencia de vía",
                  en: "Any — No route preference"
                }
              }
            ]
          }
        },
        {
          id: "protocol-duration",
          kind: "single-select",
          label: {
            es: "Duración del protocolo",
            en: "Protocol duration"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "4-weeks",
                label: {
                  es: "4 semanas",
                  en: "4 weeks"
                }
              },
              {
                id: "8-weeks",
                label: {
                  es: "8 semanas",
                  en: "8 weeks"
                }
              },
              {
                id: "12-weeks",
                label: {
                  es: "12 semanas",
                  en: "12 weeks"
                }
              },
              {
                id: "16-weeks",
                label: {
                  es: "16 semanas",
                  en: "16 weeks"
                }
              }
            ]
          }
        }
      ]
    },
    {
      id: "preferences",
      label: {
        es: "Preferencias y contexto",
        en: "Preferences and context"
      },
      title: {
        es: "Preferencias y contexto",
        en: "Preferences and context"
      },
      lede: {
        es: "Completa tu contexto y cualquier nota adicional.",
        en: "Add your context and any additional notes."
      },
      questions: [
        {
          id: "health-conditions",
          kind: "multi-select",
          label: {
            es: "¿Tienes alguna de estas condiciones?",
            en: "Do you have any of these conditions?"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "diabetes",
                label: {
                  es: "Diabetes",
                  en: "Diabetes"
                }
              },
              {
                id: "hypertension",
                label: {
                  es: "Hipertensión",
                  en: "Hypertension"
                }
              },
              {
                id: "heart-disease",
                label: {
                  es: "Enfermedad cardíaca",
                  en: "Heart disease"
                }
              },
              {
                id: "thyroid",
                label: {
                  es: "Problemas de tiroides",
                  en: "Thyroid problems"
                }
              },
              {
                id: "cancer-history",
                label: {
                  es: "Historial de cáncer",
                  en: "History of cancer"
                }
              },
              {
                id: "autoimmune",
                label: {
                  es: "Enfermedades autoinmunes",
                  en: "Autoimmune diseases"
                }
              },
              {
                id: "liver-kidney",
                label: {
                  es: "Problemas hepáticos/renales",
                  en: "Liver/kidney problems"
                }
              },
              {
                id: "pregnancy-breastfeeding",
                label: {
                  es: "Embarazo/Lactancia",
                  en: "Pregnancy/Breastfeeding"
                }
              },
              {
                id: "hormone-therapy",
                label: {
                  es: "Terapia hormonal actual",
                  en: "Current hormone therapy"
                }
              },
              {
                id: "none",
                label: {
                  es: "Ninguna de las anteriores",
                  en: "None of the above"
                }
              }
            ]
          }
        },
        {
          id: "medications",
          kind: "multi-select",
          label: {
            es: "¿Tomas algún medicamento?",
            en: "Do you take any medication?"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "none",
                label: {
                  es: "Ninguno",
                  en: "None"
                }
              },
              {
                id: "blood-pressure",
                label: {
                  es: "Medicamentos para presión",
                  en: "Blood pressure medication"
                }
              },
              {
                id: "diabetes",
                label: {
                  es: "Medicamentos para diabetes",
                  en: "Diabetes medication"
                }
              },
              {
                id: "anticoagulants",
                label: {
                  es: "Anticoagulantes",
                  en: "Anticoagulants"
                }
              },
              {
                id: "hormones",
                label: {
                  es: "Hormonas (testosterona, estrógenos)",
                  en: "Hormones (testosterone, estrogens)"
                }
              },
              {
                id: "psychiatric",
                label: {
                  es: "Medicamentos psiquiátricos",
                  en: "Psychiatric medication"
                }
              },
              {
                id: "immunosuppressants",
                label: {
                  es: "Inmunosupresores",
                  en: "Immunosuppressants"
                }
              },
              {
                id: "other",
                label: {
                  es: "Otros (especificar)",
                  en: "Other (please specify)"
                }
              }
            ]
          }
        },
        {
          id: "other-medications",
          kind: "long-text",
          label: {
            es: "¿Qué otros medicamentos tomas?",
            en: "What other medications do you take?"
          },
          markOptional: true,
          maxLength: 400,
          placeholder: {
            es: "Especifica los medicamentos…",
            en: "Specify the medications…"
          },
          visibleWhen: {
            question: "medications",
            includes: "other"
          }
        },
        {
          id: "additional-notes",
          kind: "long-text",
          label: {
            es: "Notas adicionales",
            en: "Additional notes"
          },
          markOptional: true,
          maxLength: 400,
          placeholder: {
            es: "Cualquier información relevante…",
            en: "Any relevant information…"
          }
        }
      ]
    },
    {
      id: "lifestyle",
      label: {
        es: "Sobre ti: estilo de vida",
        en: "About you: lifestyle"
      },
      title: {
        es: "Sobre ti: estilo de vida",
        en: "About you: lifestyle"
      },
      lede: {
        es: "Cuéntanos sobre tu rutina y tus metas.",
        en: "Tell us about your routine and goals."
      },
      questions: [
        {
          id: "current-frustrations",
          kind: "long-text",
          label: {
            es: "¿Qué te frustra hoy de tu cuerpo o tu energía?",
            en: "What frustrates you about your body or energy today?"
          },
          markOptional: true,
          maxLength: 400,
          placeholder: {
            es: "Siempre tengo hambre en la noche; no recupero del gym; duermo pero amanezco cansado…",
            en: "I am always hungry at night; I do not recover from the gym; I sleep but wake up tired…"
          }
        },
        {
          id: "ninety-day-goal",
          kind: "long-text",
          label: {
            es: "Tu meta concreta a 90 días",
            en: "Your specific 90-day goal"
          },
          markOptional: true,
          maxLength: 400,
          placeholder: {
            es: "Bajar 8 kg; dormir 7 h corridas; recuperar libido…",
            en: "Lose 8 kg; sleep 7 hours straight; regain libido…"
          }
        },
        {
          id: "training-type",
          kind: "single-select",
          label: {
            es: "Tipo de entrenamiento",
            en: "Training type"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "none",
                label: {
                  es: "No entreno",
                  en: "I do not train"
                }
              },
              {
                id: "strength",
                label: {
                  es: "Fuerza / pesas",
                  en: "Strength / weights"
                }
              },
              {
                id: "cardio",
                label: {
                  es: "Cardio / resistencia",
                  en: "Cardio / endurance"
                }
              },
              {
                id: "mixed",
                label: {
                  es: "Mixto",
                  en: "Mixed"
                }
              },
              {
                id: "sports",
                label: {
                  es: "Deporte",
                  en: "Sports"
                }
              },
              {
                id: "other",
                label: {
                  es: "Otro",
                  en: "Other"
                }
              }
            ]
          }
        },
        {
          id: "injection-tolerance",
          kind: "single-select",
          label: {
            es: "Tolerancia a inyecciones",
            en: "Tolerance for injections"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "avoid",
                label: {
                  es: "Prefiero evitarlas",
                  en: "I prefer to avoid them"
                }
              },
              {
                id: "low",
                label: {
                  es: "Baja",
                  en: "Low"
                }
              },
              {
                id: "moderate",
                label: {
                  es: "Moderada",
                  en: "Moderate"
                }
              },
              {
                id: "high",
                label: {
                  es: "Alta",
                  en: "High"
                }
              }
            ]
          }
        },
        {
          id: "daily-schedule",
          kind: "single-select",
          label: {
            es: "Horario de vida",
            en: "Daily schedule"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "daytime",
                label: {
                  es: "Diurno",
                  en: "Daytime"
                }
              },
              {
                id: "nighttime",
                label: {
                  es: "Nocturno",
                  en: "Nighttime"
                }
              },
              {
                id: "rotating",
                label: {
                  es: "Turnos rotativos",
                  en: "Rotating shifts"
                }
              },
              {
                id: "variable",
                label: {
                  es: "Variable",
                  en: "Variable"
                }
              }
            ]
          }
        },
        {
          id: "work-type",
          kind: "single-select",
          label: {
            es: "Tipo de trabajo",
            en: "Type of work"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "seated",
                label: {
                  es: "Principalmente sentado",
                  en: "Mostly seated"
                }
              },
              {
                id: "standing",
                label: {
                  es: "Principalmente de pie",
                  en: "Mostly standing"
                }
              },
              {
                id: "physical",
                label: {
                  es: "Trabajo físico",
                  en: "Physical work"
                }
              },
              {
                id: "mixed",
                label: {
                  es: "Mixto",
                  en: "Mixed"
                }
              },
              {
                id: "not-working",
                label: {
                  es: "Actualmente no trabajo",
                  en: "Not currently working"
                }
              }
            ]
          }
        },
        {
          id: "alcohol",
          kind: "single-select",
          label: {
            es: "Alcohol",
            en: "Alcohol"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "none",
                label: {
                  es: "No consumo",
                  en: "I do not drink"
                }
              },
              {
                id: "occasional",
                label: {
                  es: "Ocasionalmente",
                  en: "Occasionally"
                }
              },
              {
                id: "weekly",
                label: {
                  es: "Semanalmente",
                  en: "Weekly"
                }
              },
              {
                id: "daily",
                label: {
                  es: "Diariamente",
                  en: "Daily"
                }
              }
            ]
          }
        },
        {
          id: "caffeine",
          kind: "single-select",
          label: {
            es: "Cafeína (tazas/día)",
            en: "Caffeine (cups/day)"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "0",
                label: {
                  es: "0",
                  en: "0"
                }
              },
              {
                id: "1",
                label: {
                  es: "1",
                  en: "1"
                }
              },
              {
                id: "2",
                label: {
                  es: "2",
                  en: "2"
                }
              },
              {
                id: "3",
                label: {
                  es: "3",
                  en: "3"
                }
              },
              {
                id: "4",
                label: {
                  es: "4",
                  en: "4"
                }
              },
              {
                id: "5-plus",
                label: {
                  es: "5 o más",
                  en: "5 or more"
                }
              }
            ]
          }
        },
        {
          id: "main-priority",
          kind: "single-select",
          label: {
            es: "Tu prioridad real (¿qué pesa más?)",
            en: "Your real priority (what matters most?)"
          },
          options: {
            kind: "static",
            items: [
              {
                id: "aesthetics",
                label: {
                  es: "Estética",
                  en: "Aesthetics"
                }
              },
              {
                id: "performance",
                label: {
                  es: "Rendimiento",
                  en: "Performance"
                }
              },
              {
                id: "health",
                label: {
                  es: "Salud",
                  en: "Health"
                }
              },
              {
                id: "balanced",
                label: {
                  es: "Balanceado",
                  en: "Balanced"
                }
              }
            ]
          }
        },
        {
          id: "injuries",
          kind: "long-text",
          label: {
            es: "Lesiones activas o recientes",
            en: "Active or recent injuries"
          },
          markOptional: true,
          maxLength: 400,
          placeholder: {
            es: "Tendinopatía de rodilla, lesión lumbar, hombro…",
            en: "Knee tendinopathy, lower back injury, shoulder…"
          }
        }
      ]
    }
  ]
};
