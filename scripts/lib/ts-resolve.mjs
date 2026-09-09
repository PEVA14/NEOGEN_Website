/**
 * Resolver hook: lets plain Node run the project's TypeScript modules.
 *
 * Node's own `--experimental-strip-types` erases the types but keeps Node's
 * ESM resolution, which refuses extensionless specifiers and knows nothing
 * about the `@/*` alias in tsconfig. This fills exactly those two gaps so the
 * check scripts can import `src/data/catalog` itself rather than re-parsing
 * it — a check that reads a copy of the data proves nothing about the data.
 */
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const src = path.resolve(import.meta.dirname, "../../src");

function firstFile(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  let base = null;

  if (specifier.startsWith("@/")) {
    base = path.join(src, specifier.slice(2));
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }

  const file = base && firstFile(base);
  // `module-typescript` is stated rather than inferred: without it Node parses
  // the file as CommonJS, fails, and reparses — a warning per module.
  if (file) {
    return { url: pathToFileURL(file).href, format: "module-typescript", shortCircuit: true };
  }

  return next(specifier, context);
}
