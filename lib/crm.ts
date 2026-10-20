import { hoje } from "./prazo";
import type { Contato } from "./types";

const TZ = "America/Sao_Paulo";
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Mês atual em Brasília, AAAA-MM. */
export const mesAtual = () => hoje().slice(0, 7);

/** AAAA-MM-DD da data/hora em Brasília. */
export const diaBR = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });

/** "sex 24/10, 20h" (ou "20h30"). */
export function dataHora(iso: string | null) {
  if (!iso) return "sem data";
  const d = new Date(iso);
  const p = Object.fromEntries(new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d).map((x) => [x.type, x.value]));
  const sem = SEMANA[new Date(diaBR(iso) + "T12:00:00Z").getUTCDay()];
  return `${sem} ${p.day}/${p.month}, ${p.hour}h${p.minute === "00" ? "" : p.minute}`;
}

/** Valor do <input type="datetime-local"> (hora de Brasília) a partir do ISO, e o caminho de volta. */
export function paraInput(iso: string | null) {
  if (!iso) return "";
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
// Brasília não tem horário de verão desde 2019
export const deInput = (v: string) => (v ? new Date(`${v}:00-03:00`).toISOString() : null);

export const ABERTAS = new Set(["conversa", "proposta"]);

/** Números do pipeline. Mês = data do atendimento (ou da criação, se não tiver data). */
export function resumoCrm(cs: Contato[], mes = mesAtual()) {
  const doMes = (c: Contato) => diaBR(c.data_hora ?? c.created_at).startsWith(mes);
  const soma = (xs: Contato[]) => xs.reduce((s, c) => s + (c.valor ?? 0), 0);
  const realizados = cs.filter((c) => c.etapa === "realizado");
  const perdidos = cs.filter((c) => c.etapa === "perdido");
  const agora = Date.now();
  return {
    porEtapa: (e: Contato["etapa"]) => cs.filter((c) => c.etapa === e).length,
    negociacao: soma(cs.filter((c) => ABERTAS.has(c.etapa))),
    agendadoMes: soma(cs.filter((c) => c.etapa === "agendado" && doMes(c))),
    realizadoMes: soma(realizados.filter(doMes)),
    conversao: realizados.length + perdidos.length ? realizados.length / (realizados.length + perdidos.length) : null,
    proximos: cs
      .filter((c) => c.etapa === "agendado" && c.data_hora && Date.parse(c.data_hora) >= agora - 3_600_000)
      .sort((a, b) => a.data_hora!.localeCompare(b.data_hora!)),
  };
}

/** "Outubro de 2026" a partir de AAAA-MM. */
export function nomeMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Soma n meses a AAAA-MM (n pode ser negativo). */
export function somaMes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
}
