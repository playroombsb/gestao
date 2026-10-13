import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Cliente com service_role. Só roda no servidor; o navegador nunca vê a chave. */
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function chaveValida(k: string | undefined | null) {
  const certa = process.env.ACCESS_KEY;
  return Boolean(certa && k && k === certa);
}
