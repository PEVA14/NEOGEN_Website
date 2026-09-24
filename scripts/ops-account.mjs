/**
 * CREATE AN OPERATIONS CONSOLE ACCOUNT ENTRY.
 *
 *   npm run ops:account -- ana
 *
 * Asks for the password (not echoed), and prints one `name:salt:hash` entry
 * to append to OPS_ACCOUNTS (comma-separated). The password itself is never
 * printed, stored or passed on the command line, where shell history and the
 * process list would keep it.
 *
 * Uses the same scrypt parameters as `src/server/ops/auth.ts`.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { stdin, stdout } from "node:process";

const name = (process.argv[2] ?? "").trim().toLowerCase();
if (!/^[a-z][a-z0-9._-]{1,31}$/.test(name)) {
  console.error("Usage: npm run ops:account -- <name>   (lowercase, 2-32 chars: a-z 0-9 . _ -)");
  process.exit(1);
}

async function readHidden(prompt) {
  stdout.write(prompt);
  if (!stdin.isTTY) {
    const chunks = [];
    for await (const chunk of stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString().split("\n")[0];
  }
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  let value = "";
  return new Promise((resolve) => {
    stdin.on("data", (ch) => {
      if (ch === "\r" || ch === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write("\n");
        resolve(value);
      } else if (ch === "\u0003") {
        process.exit(130);
      } else if (ch === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    });
  });
}

const password = await readHidden(`Password for ${name}: `);
if (password.length < 12) {
  console.error("Use at least 12 characters.");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password.normalize("NFKC"), salt, 32, { N: 16384, r: 8, p: 1 });
console.log(`${name}:${salt.toString("base64url")}:${hash.toString("base64url")}`);
