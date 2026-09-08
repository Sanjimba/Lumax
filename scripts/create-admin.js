const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");
const bcrypt = require("bcryptjs");

async function main() {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const username = (await terminal.question("Utilizador administrador: ")).trim();
    const password = await terminal.question("Palavra-passe (não será mostrada): ", { hideEchoBack: true });
    if (!username || password.length < 12) throw new Error("Indique um utilizador e uma palavra-passe com pelo menos 12 caracteres.");
    const hash = await bcrypt.hash(password, 12);
    const envFile = path.join(process.cwd(), ".env");
    const existing = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
    const set = (text, key, value) => new RegExp(`^${key}=.*$`, "m").test(text) ? text.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`) : `${text}${text && !text.endsWith("\n") ? "\n" : ""}${key}=${value}\n`;
    let next = set(set(existing, "ADMIN_USER", username), "ADMIN_PASSWORD_HASH", hash);
    if (!/^JWT_SECRET=/m.test(next)) next = set(next, "JWT_SECRET", crypto.randomBytes(32).toString("hex"));
    fs.writeFileSync(envFile, next, { mode: 0o600 });
    console.log(`Credenciais guardadas em ${envFile}. Não envie este ficheiro para o Git.`);
    console.log("No Render, copie ADMIN_USER e ADMIN_PASSWORD_HASH para Environment Variables e faça novo deploy.");
  } finally { terminal.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
