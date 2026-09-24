import { notFound, redirect } from "next/navigation";

import { loginAction } from "@/server/ops/actions";
import { currentOperator, opsConfigured } from "@/server/ops/auth";

import { OPS } from "../copy";
import styles from "../ops.module.css";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Acceso" };

const ERRORS: Record<string, string> = {
  invalid: "Usuario o contraseña incorrectos.",
  locked: "Demasiados intentos. Espera 15 minutos.",
  disabled: "La consola no está configurada.",
};

/**
 * SIGN IN. A plain form posting to a server action — works without
 * JavaScript. The error never says which half was wrong.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!opsConfigured()) notFound();
  if (await currentOperator()) redirect("/ops/pedidos");
  const { error } = await searchParams;

  return (
    <main id="main-content" className={styles.login}>
      <form action={loginAction} className={styles.loginCard}>
        <div>
          <p className={styles.eyebrow}>{OPS.brand}</p>
          <h1 className={styles.title}>Acceso</h1>
        </div>
        {error && ERRORS[error] ? (
          <p className={styles.flash} data-tone="error" role="alert">
            {ERRORS[error]}
          </p>
        ) : null}
        <label className={styles.label}>
          <span className={styles.labelText}>Usuario</span>
          <input
            name="name"
            className={styles.input}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={32}
          />
        </label>
        <label className={styles.label}>
          <span className={styles.labelText}>Contraseña</span>
          <input
            name="password"
            type="password"
            className={styles.input}
            autoComplete="current-password"
            required
            maxLength={256}
          />
        </label>
        <button type="submit" className={styles.button}>
          Entrar
        </button>
      </form>
    </main>
  );
}
