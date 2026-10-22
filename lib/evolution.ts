import "server-only";

// Cliente da Evolution API (v2), que roda na VPS do Playroom. Só o servidor fala com ela; a chave nunca vai ao navegador.

export const EVENTOS_WEBHOOK = ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"];

export type EstadoWhats = "conectado" | "conectando" | "desconectado" | "sem_instancia" | "indisponivel";

export class ErroEvolution extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

function cfg() {
  const url = process.env.EVOLUTION_URL?.replace(/\/+$/, "");
  const chave = process.env.EVOLUTION_API_KEY;
  const instancia = process.env.EVOLUTION_INSTANCE || "playroom";
  if (!url || !chave) throw new ErroEvolution(0, "Faltam EVOLUTION_URL e EVOLUTION_API_KEY no ambiente.");
  return { url, chave, instancia };
}

export const configurado = () => Boolean(process.env.EVOLUTION_URL && process.env.EVOLUTION_API_KEY);
export const instancia = () => process.env.EVOLUTION_INSTANCE || "playroom";

async function evo<T = Record<string, unknown>>(caminho: string, init: { method?: string; body?: unknown; timeout?: number } = {}): Promise<T> {
  const { url, chave } = cfg();
  const r = await fetch(url + caminho, {
    method: init.method ?? "GET",
    headers: { apikey: chave, "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(init.timeout ?? 15_000),
  });
  const texto = await r.text();
  let json: unknown = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* resposta não JSON */ }
  if (!r.ok) {
    const msg = JSON.stringify((json as Record<string, unknown>)?.response ?? (json as Record<string, unknown>)?.message ?? texto).slice(0, 300);
    throw new ErroEvolution(r.status, msg);
  }
  return json as T;
}

/** Estado da conexão do WhatsApp do Playroom. */
export async function estado(): Promise<{ estado: EstadoWhats; numero?: string; nome?: string }> {
  if (!configurado()) return { estado: "indisponivel" };
  try {
    // Tempo curto: a página de Conversas espera por isto antes de abrir
    const lista = await evo<Record<string, unknown>[]>(`/instance/fetchInstances?instanceName=${encodeURIComponent(instancia())}`, { timeout: 5_000 });
    const i = Array.isArray(lista) ? lista.find((x) => (x.name ?? x.instanceName) === instancia()) : undefined;
    if (!i) return { estado: "sem_instancia" };
    const s = String(i.connectionStatus ?? "");
    const numero = String(i.ownerJid ?? "").split("@")[0].replace(/\D/g, "") || undefined;
    return {
      estado: s === "open" ? "conectado" : s === "connecting" ? "conectando" : "desconectado",
      numero, nome: i.profileName ? String(i.profileName) : undefined,
    };
  } catch (e) {
    if (e instanceof ErroEvolution && e.status === 404) return { estado: "sem_instancia" };
    return { estado: "indisponivel" };
  }
}

/** Liga o webhook da instância ao sistema. */
export function configurarWebhook(webhookUrl: string) {
  return evo(`/webhook/set/${instancia()}`, {
    method: "POST",
    body: { webhook: { enabled: true, url: webhookUrl, byEvents: false, base64: false, events: EVENTOS_WEBHOOK } },
  });
}

/**
  Cria a instância (se ainda não existe), liga o webhook e devolve o QR code para conectar o celular.
  qr = imagem em data URL; codigo = código de pareamento por número, quando a Evolution manda.
*/
export async function conectar(webhookUrl: string): Promise<{ qr: string | null; codigo: string | null }> {
  const atual = await estado();
  if (atual.estado === "indisponivel") throw new ErroEvolution(0, "A Evolution não respondeu.");
  if (atual.estado === "sem_instancia") {
    await evo(`/instance/create`, {
      method: "POST",
      body: {
        instanceName: instancia(), integration: "WHATSAPP-BAILEYS", qrcode: true,
        // O sistema guarda as conversas; a instância não precisa ler grupos nem status
        groupsIgnore: true, readMessages: false, readStatus: false, alwaysOnline: false, syncFullHistory: false,
        webhook: { enabled: true, url: webhookUrl, byEvents: false, base64: false, events: EVENTOS_WEBHOOK },
      },
    });
  } else {
    await configurarWebhook(webhookUrl);
  }
  if (atual.estado === "conectado") return { qr: null, codigo: null };
  const c = await evo<Record<string, unknown>>(`/instance/connect/${instancia()}`);
  const qr = typeof c?.base64 === "string" ? c.base64 : null;
  return { qr, codigo: typeof c?.pairingCode === "string" ? c.pairingCode : null };
}

/** Desliga o celular da instância (a instância continua existindo para reconectar depois). */
export function desconectar() {
  return evo(`/instance/logout/${instancia()}`, { method: "DELETE" });
}

/** Envia texto. Devolve a mensagem no mesmo formato do webhook (key, message, messageTimestamp, status). */
export function enviarTexto(numero: string, texto: string) {
  return evo<Record<string, unknown>>(`/message/sendText/${instancia()}`, {
    method: "POST", body: { number: numero, text: texto }, timeout: 30_000,
  });
}

/** Baixa a mídia de uma mensagem (foto, áudio, vídeo, documento) direto da Evolution. */
export async function baixarMidia(id: string, audio: boolean) {
  const r = await evo<Record<string, unknown>>(`/chat/getBase64FromMediaMessage/${instancia()}`, {
    method: "POST", body: { message: { key: { id } }, convertToMp4: audio }, timeout: 60_000,
  });
  const base64 = typeof r?.base64 === "string" ? r.base64 : "";
  if (!base64) throw new ErroEvolution(404, "mídia não encontrada");
  return {
    dados: Buffer.from(base64, "base64"),
    mime: String(r.mimetype ?? "") || "application/octet-stream",
    nome: r.fileName ? String(r.fileName) : null,
  };
}
