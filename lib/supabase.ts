import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Cliente com service_role. Só roda no servidor; o navegador nunca vê a chave. */
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "studio_sm" },
    // Next 14 guarda em cache o fetch do supabase-js; sem isso a página mostra dado velho em produção.
    global: { fetch: (u, init) => fetch(u, { ...init, cache: "no-store" }) },
  });
}

/** Sem ACCESS_KEY no ambiente o acesso é aberto: qualquer pessoa com o endereço vê e edita. */
export function chaveValida(k: string | undefined | null) {
  const certa = process.env.ACCESS_KEY;
  if (!certa) return true;
  return Boolean(k && k === certa);
}

/** O painel de leitura abre com a chave de edição ou com a PAINEL_KEY (só leitura). */
export function chavePainelValida(k: string | undefined | null) {
  const leitura = process.env.PAINEL_KEY;
  return chaveValida(k) || Boolean(leitura && k && k === leitura);
}
