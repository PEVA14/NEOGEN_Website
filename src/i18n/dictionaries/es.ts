/**
 * Spanish (es-MX) — the SOURCE dictionary.
 *
 * Its shape defines the `Dictionary` type, so every other locale is compelled
 * by the type checker to stay complete. Add a key here first.
 *
 * Rules:
 *  - UI copy lives here, never in product/world configuration.
 *  - No product claims, prices, certifications or shipping promises.
 */
const es = {
  meta: {
    siteName: "NEOGEN",
    tagline: "Laboratorio Vivo",
    description:
      "NEOGEN — laboratorio de precisión. Sitio en construcción; el contenido de producto aún no está disponible.",
  },

  a11y: {
    skipToContent: "Saltar al contenido principal",
    mainNavigation: "Navegación principal",
    footerNavigation: "Navegación del pie de página",
    languageSwitcher: "Cambiar idioma",
    currentLanguage: "Idioma actual",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    breadcrumb: "Ruta de navegación",
  },

  nav: {
    home: "Inicio",
    products: "Productos",
    research: "Investigación",
    cart: "Carrito",
    checkout: "Pago",
  },

  home: {
    title: "NEOGEN",
    skeletonNote:
      "Estructura de la Fase 1. La portada definitiva y la experiencia 3D se construirán en fases posteriores.",
  },

  products: {
    title: "Productos",
    intro: "Catálogo en preparación.",
    empty: "Aún no hay productos publicados.",
    detailTitle: "Ficha de producto",
    sections: {
      experience: "Experiencia",
      commerce: "Compra",
      specifications: "Especificaciones",
      documentation: "Documentación",
      research: "Investigación",
      related: "Productos relacionados",
    },
  },

  research: {
    title: "Investigación",
    intro: "Centro de investigación y divulgación de NEOGEN. Estructura editorial en preparación.",
    empty: "Aún no hay artículos publicados.",
    articleTitle: "Artículo",
  },

  cart: {
    title: "Carrito",
    empty: "Tu carrito está vacío.",
    summary: "Resumen del pedido",
  },

  checkout: {
    title: "Pago",
    guestNote: "La compra como invitado estará disponible.",
  },

  status: {
    /** Neutral verification vocabulary — see components/ui/StatusNote. */
    pending: "Pendiente de verificación",
    notAvailable: "No disponible",
    tbd: "Por definir",
    placeholderNotice:
      "Marcador de posición. Este dato aún no ha sido verificado y no debe interpretarse como información definitiva.",
  },

  error: {
    notFoundTitle: "Página no encontrada",
    notFoundBody: "La página que buscas no existe o cambió de dirección.",
    genericTitle: "Algo salió mal",
    genericBody: "Ocurrió un error inesperado. Intenta de nuevo.",
    retry: "Reintentar",
    backHome: "Volver al inicio",
    loading: "Cargando…",
  },
} as const;

export default es;
