import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /*
   * IMAGE OPTIMISATION — configured for product photography that does not
   * exist yet, so the first photograph lands on a pipeline rather than
   * starting a conversation about one.
   *
   * Next's own optimizer does the work: it generates a `srcSet` from each
   * call's `sizes`, which is what serves a 2x file to a retina phone and a
   * small one to a slow connection, and it is why no custom pipeline is
   * needed here.
   */
  images: {
    /*
     * AVIF first, WebP second, original as the last resort. The default is
     * WebP only; AVIF is typically 20-30% smaller again on the kind of
     * photography this catalogue will carry — glass, metal, controlled
     * lighting, large smooth gradients — which is exactly where it wins most.
     * The cost is encode time on the first request for each variant, paid
     * once and cached.
     */
    formats: ["image/avif", "image/webp"],
    /*
     * Assets are versioned by FILENAME (see public/images/README.md), so a
     * given URL never changes content and there is nothing to revalidate.
     */
    minimumCacheTTL: 31536000,
  },

  // Phase 2 will load .glb assets from /public/models. They are served as static
  // files, so no loader config is required — but they are large and immutable,
  // so give them a long-lived cache header.
  async headers() {
    return [
      {
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
