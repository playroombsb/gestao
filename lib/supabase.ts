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
