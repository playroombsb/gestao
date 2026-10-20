import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Formato guardado: scrypt$<sal base64>$<hash base64>. */
export function gerarHash(senha: string) {
  const sal = randomBytes(16);
  return `scrypt$${sal.toString("base64")}$${scryptSync(senha, sal, 64).toString("base64")}`;
}

export function conferirSenha(senha: string, guardado: string) {
  const [alg, sal, hash] = guardado.split("$");
  if (alg !== "scrypt" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const calculado = scryptSync(senha, Buffer.from(sal, "base64"), esperado.length);
  return timingSafeEqual(calculado, esperado);
}

/** "Serena " e "SERENA" viram "serena"; acentos saem. */
export function normalizarLogin(v: unknown) {
  return String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
