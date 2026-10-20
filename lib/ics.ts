import "server-only";
import type { Contato, Evento } from "./types";

/*
  Feed iCalendar (RFC 5545) da agenda, para assinar no Google Agenda.
  Mão única: o Google lê daqui de tempos em tempos; nada volta para o sistema.
*/

const DUAS_HORAS = 2 * 3_600_000;

const utc = (iso: string | number) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** Quebra linhas longas em 75 caracteres, como a norma pede. */
function dobrar(linha: string) {
  const partes: string[] = [];
  for (let i = 0; i < linha.length; i += 74) partes.push((i ? " " : "") + linha.slice(i, i + 74));
  return partes.join("\r\n");
}

function vevento(uid: string, inicio: string, fim: string | null, titulo: string, local = "", desc = "") {
  const fimMs = fim ? Date.parse(fim) : Date.parse(inicio) + DUAS_HORAS;
  return [
    "BEGIN:VEVENT",
    `UID:${uid}@sm.testesana.com.br`,
    `DTSTAMP:${utc(Date.now())}`,
    `DTSTART:${utc(inicio)}`,
    `DTEND:${utc(fimMs)}`,
    `SUMMARY:${esc(titulo)}`,
    local && `LOCATION:${esc(local)}`,
    desc && `DESCRIPTION:${esc(desc)}`,
    "END:VEVENT",
  ].filter(Boolean).map((l) => dobrar(l as string));
}

const ROTULO = { workshop: "Workshop", evento: "Evento", outro: "" } as const;

export function gerarIcs(contatos: Contato[], eventos: Evento[]) {
  const linhas = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Studio SM//Playroom//PT", "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Playroom", "X-WR-TIMEZONE:America/Sao_Paulo",
  ];
  for (const c of contatos) {
    if (!c.data_hora) continue;
    const tipo = c.tipo === "aluguel" ? "Aluguel" : "Sessão";
    const titulo = `${tipo} · ${c.apelido || "sem apelido"}${c.etapa === "proposta" ? " (a confirmar)" : ""}`;
    linhas.push(...vevento(`crm-${c.id}`, c.data_hora, null, titulo, "", c.duracao ? `Duração: ${c.duracao}` : ""));
  }
  for (const e of eventos) {
    const titulo = [ROTULO[e.tipo], e.titulo].filter(Boolean).join(" · ") || "Evento";
    linhas.push(...vevento(`agenda-${e.id}`, e.inicio, e.fim, titulo, e.local, e.observacoes));
  }
  linhas.push("END:VCALENDAR");
  return linhas.join("\r\n") + "\r\n";
}
