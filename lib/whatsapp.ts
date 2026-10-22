// Tradução das mensagens da Evolution (formato do WhatsApp/Baileys) para o formato do sistema.
// Funções puras: sem banco e sem rede, para dar para testar com payloads de exemplo.

export type TipoMsg = "texto" | "imagem" | "audio" | "video" | "documento" | "figurinha" | "localizacao" | "contato" | "outro";
export type StatusMsg = "" | "pendente" | "enviada" | "entregue" | "lida" | "erro";

export type MsgLida = {
  id: string;
  jid: string;
  telefone: string;
  de_mim: boolean;
  nome: string; // pushName (só vale como nome da conversa quando a mensagem é da pessoa)
  tipo: TipoMsg;
  texto: string;
  midia_nome: string | null;
  midia_mime: string | null;
  status: StatusMsg;
  em: string; // ISO
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

const MAX_TEXTO = 10_000;

/** Só conversas individuais. Grupos, status, listas de transmissão e canais ficam de fora. */
export function jidIndividual(jid: string) {
  return /@(s\.whatsapp\.net|lid)$/.test(jid);
}

/** Telefone em dígitos, quando o id é de número (o @lid esconde o número). */
export function telefoneDoJid(jid: string) {
  return jid.endsWith("@s.whatsapp.net") ? jid.split("@")[0].split(":")[0].replace(/\D/g, "") : "";
}

/** Número para enviar pela Evolution: dígitos quando houver, senão o id inteiro. */
export function destinoDoJid(jid: string) {
  return telefoneDoJid(jid) || jid;
}

/** 5561999998888 → +55 61 99999-8888 (só para mostrar). */
export function telefoneBonito(t: string) {
  const m = t.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `+55 ${m[1]} ${m[2]}-${m[3]}` : t ? `+${t}` : "";
}

const STATUS_EVO: Record<string, StatusMsg> = {
  "0": "erro", ERROR: "erro",
  "1": "pendente", PENDING: "pendente",
  "2": "enviada", SERVER_ACK: "enviada",
  "3": "entregue", DELIVERY_ACK: "entregue",
  "4": "lida", READ: "lida",
  "5": "lida", PLAYED: "lida",
};
export const statusDaEvolution = (s: unknown): StatusMsg => STATUS_EVO[str(s).toUpperCase()] ?? "";

const ORDEM_STATUS: Record<StatusMsg, number> = { "": 0, erro: 0, pendente: 1, enviada: 2, entregue: 3, lida: 4 };
/** Status só avança (o WhatsApp às vezes manda "entregue" depois de "lida"). */
export function statusAvanca(atual: StatusMsg, novo: StatusMsg) {
  if (!novo) return false;
  if (novo === "erro") return atual === "pendente" || atual === "";
  return ORDEM_STATUS[novo] > ORDEM_STATUS[atual];
}

/** messageTimestamp vem como número, texto ou Long ({ low, high }), em segundos. */
function quando(ts: unknown): string {
  let s = 0;
  if (typeof ts === "number") s = ts;
  else if (typeof ts === "string") s = Number(ts);
  else if (ts && typeof ts === "object") s = Number(obj(ts).low ?? 0) + Number(obj(ts).high ?? 0) * 2 ** 32;
  return new Date(s > 0 ? s * 1000 : Date.now()).toISOString();
}

/** Tira os envelopes (temporária, visualização única, documento com legenda, editada). */
function desembrulhar(m: Obj): Obj {
  for (let i = 0; i < 4; i++) {
    const dentro =
      obj(m.ephemeralMessage).message ?? obj(m.viewOnceMessage).message ?? obj(m.viewOnceMessageV2).message ??
      obj(m.viewOnceMessageV2Extension).message ?? obj(m.documentWithCaptionMessage).message;
    if (!dentro) break;
    m = obj(dentro);
  }
  return m;
}

/** Conteúdo da mensagem. null = algo que não vira mensagem na tela (reação, apagar, aviso do sistema). */
export function conteudo(message: unknown): Pick<MsgLida, "tipo" | "texto" | "midia_nome" | "midia_mime"> | null {
  const m = desembrulhar(obj(message));
  const corta = (t: string) => t.slice(0, MAX_TEXTO);
  const base = { midia_nome: null, midia_mime: null };

  if (typeof m.conversation === "string") return { tipo: "texto", texto: corta(m.conversation), ...base };
  if (m.extendedTextMessage) return { tipo: "texto", texto: corta(str(obj(m.extendedTextMessage).text)), ...base };

  const midia = (chave: string, tipo: TipoMsg) => {
    const x = obj(m[chave]);
    return {
      tipo, texto: corta(str(x.caption)),
      midia_nome: str(x.fileName) || null,
      midia_mime: str(x.mimetype) || null,
    };
  };
  if (m.imageMessage) return midia("imageMessage", "imagem");
  if (m.videoMessage) return midia("videoMessage", "video");
  if (m.ptvMessage) return midia("ptvMessage", "video");
  if (m.audioMessage) return midia("audioMessage", "audio");
  if (m.documentMessage) return midia("documentMessage", "documento");
  if (m.stickerMessage) return midia("stickerMessage", "figurinha");

  if (m.locationMessage || m.liveLocationMessage) {
    const x = obj(m.locationMessage ?? m.liveLocationMessage);
    const lat = Number(x.degreesLatitude), lng = Number(x.degreesLongitude);
    const onde = [str(x.name), str(x.address)].filter(Boolean).join(", ");
    const mapa = Number.isFinite(lat) && Number.isFinite(lng) ? `https://maps.google.com/?q=${lat},${lng}` : "";
    return { tipo: "localizacao", texto: [onde, mapa].filter(Boolean).join("\n"), ...base };
  }
  if (m.contactMessage) return { tipo: "contato", texto: corta(str(obj(m.contactMessage).displayName)), ...base };
  if (m.contactsArrayMessage) {
    const nomes = (Array.isArray(obj(m.contactsArrayMessage).contacts) ? (obj(m.contactsArrayMessage).contacts as unknown[]) : [])
      .map((c) => str(obj(c).displayName)).filter(Boolean);
    return { tipo: "contato", texto: corta(nomes.join(", ")), ...base };
  }

  // Reações, apagar para todos, edições, enquetes de sistema: não aparecem como mensagem
  const soContexto = Object.keys(m).every((k) => k === "messageContextInfo");
  if (m.reactionMessage || m.protocolMessage || m.editedMessage || m.senderKeyDistributionMessage || soContexto) {
    return null;
  }
  if (m.pollCreationMessage || m.pollCreationMessageV3) {
    const x = obj(m.pollCreationMessage ?? m.pollCreationMessageV3);
    return { tipo: "outro", texto: corta(`Enquete: ${str(x.name)}`), ...base };
  }
  return Object.keys(m).length ? { tipo: "outro", texto: "", ...base } : null;
}

/**
  Lê um item de messages.upsert (ou a resposta de sendText, que tem o mesmo formato).
  null = não é de conversa individual ou não vira mensagem na tela.
*/
export function lerMensagem(data: unknown): MsgLida | null {
  const d = obj(data);
  const key = obj(d.key);
  const id = str(key.id);
  // Conversas com @lid: quando a Evolution informa o número junto, a conversa fica no número (não se divide em duas)
  const alt = [str(key.remoteJidAlt), str(key.senderPn)].find((j) => j.endsWith("@s.whatsapp.net"));
  const jid = alt ?? str(key.remoteJid);
  if (!id || !jidIndividual(jid)) return null;
  const c = conteudo(d.message);
  if (!c) return null;
  const de_mim = key.fromMe === true;
  return {
    id, jid, telefone: telefoneDoJid(jid), de_mim,
    nome: str(d.pushName).slice(0, 120),
    ...c,
    status: statusDaEvolution(d.status) || (de_mim ? "enviada" : ""),
    em: quando(d.messageTimestamp),
  };
}

/** Item de messages.update: id da mensagem no WhatsApp e status novo. */
export function lerAtualizacao(data: unknown): { id: string; status: StatusMsg } | null {
  const d = obj(data);
  const id = str(d.keyId) || str(obj(d.key).id);
  const status = statusDaEvolution(d.status ?? obj(d.update).status);
  return id && status ? { id, status } : null;
}
