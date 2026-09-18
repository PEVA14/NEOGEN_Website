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
  /*
   * `server-only` throws outside a React Server Components build. The check
   * scripts ARE server-side code, so they get what the server gets: an empty
   * module. This is how `check:atlas` can read the exact prompt the model
   * would receive (`server/atlas/prompt.ts`) instead of a copy of it.
   */
  if (specifier === "server-only") {
    return { url: "data:text/javascript,export{}", format: "module", shortCircuit: true };
  }

  let base = null;

  if (specifier.startsWith("@/")) {
    base = path.join(src, specifier.slice(2));
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }

  const file = base && firstFile(base);
  // `module-typescript` is stated rather than inferred: without it Node parses
  // the file as CommonJS, fails, and reparses — a warning per module.
  //
  // Only the project's own TypeScript. A relative import INSIDE a package
  // (the Anthropic SDK's `client.mjs` importing its siblings) also resolves to
  // an existing file, and claiming it as TypeScript makes Node refuse to load
  // it: type stripping is unsupported under node_modules. Those stay with
  // Node's default resolution.
  if (file && /\.tsx?$/.test(file) && !file.split(path.sep).includes("node_modules")) {
    return { url: pathToFileURL(file).href, format: "module-typescript", shortCircuit: true };
  }

  return next(specifier, context);
}
