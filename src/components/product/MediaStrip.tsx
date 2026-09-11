import Image from "next/image";

import { Mono } from "@/components/typography";

import styles from "./MediaStrip.module.css";

import type { ProductImage } from "@/content/media";

/**
 * SUPPLEMENTARY MEDIA — alternates, detail, packaging.
 *
 * READY, AND RENDERING NOTHING. No product has these images, so this returns
 * null on every page today. It exists so that the day photography lands, a
 * registry entry is the only change: the strip appears under the opening in
 * fixed 4:5 frames, and nothing above it moves.
 *
 * Lazy by default — none of these is the page's largest paint — and sized for
 * a four-across strip, so a phone never downloads desktop-width detail shots.
 */
export function MediaStrip({
  images,
  labels,
}: {
  images: readonly { role: "alternate" | "detail" | "packaging"; image: ProductImage }[];
  labels: Record<"alternate" | "detail" | "packaging", string>;
}) {
  if (images.length === 0) return null;

  return (
    <ul className={styles.strip}>
      {images.map(({ role, image }, index) => (
        <li key={image.src} className={styles.item}>
          <div className={styles.frame}>
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              className={styles.image}
              sizes="(min-width: 64rem) 20rem, 50vw"
            />
          </div>
          <Mono size="2xs" className={styles.label}>
            {String(index + 1).padStart(2, "0")} · {labels[role]}
          </Mono>
        </li>
      ))}
    </ul>
  );
}
