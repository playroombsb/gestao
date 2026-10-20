"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { aprovarAplicacao, removerAplicacao, salvarAplicacao } from "@/app/actions-gestao";
import { useAutosave } from "@/lib/useAutosave";
import type { Aplicacao, StatusAplicacao } from "@/lib/types";
import Cabecalho, { BOTAO, BOTAO_2, PAGINA } from "./Cabecalho";
import StatusSalvo from "./StatusSalvo";

const STATUS: { k: StatusAplicacao; t: string }[] = [
  { k: "nova", t: "Novas" }, { k: "analise", t: "Em análise" }, { k: "aprovada", t: "Aprovadas" }, { k: "recusada", t: "Recusadas" },
];
const SELO: Record<StatusAplicacao, [string, string]> = {
  nova: ["Nova", "bg-red text-white"],
  analise: ["Em análise", "border-[1.5px] border-ink"],
  aprovada: ["Aprovada", "bg-ink text-white"],
  recusada: ["Recusada", "border-[1.5px] border-line text-muted"],
};
const ROTULO = "text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted";

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function Aplicacoes({ inicial }: { inicial: Aplicacao[] }) {
  const router = useRouter();
  const [apps, setApps] = useState(inicial);
  const [filtro, setFiltro] = useState<StatusAplicacao>(inicial.some((a) => a.status === "nova") ? "nova" : "analise");
  const [aberta, setAberta] = useState<string | null>(null);
  const [armado, setArmado] = useState(false);
  const { status, rodar, agendar, esquecer } = useAutosave<{ nota?: string }>(salvarAplicacao);

  const lista = apps.filter((a) => a.status === filtro);
  const atual = apps.find((a) => a.id === aberta) ?? lista[0] ?? null;

  function alterar(id: string, patch: { nota?: string }) {
    setApps((xs) => xs.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    agendar(id, patch);
  }

  // Depois de agir, a ficha continua aberta mesmo que a aplicação saia do filtro atual.
  async function mudarStatus(id: string, s: StatusAplicacao) {
    setAberta(id);
    setApps((xs) => xs.map((a) => (a.id === id ? { ...a, status: s } : a)));
    const r = await rodar(() => salvarAplicacao(id, { status: s }));
    if (r.ok) router.refresh(); // atualiza o número do menu
  }

  async function aprovar(a: Aplicacao) {
    setAberta(a.id);
    const r = await rodar(() => aprovarAplicacao(a.id));
    if (!r.ok) return;
    setApps((xs) => xs.map((x) => (x.id === a.id ? { ...x, status: "aprovada", contato_id: r.data.contato_id } : x)));
    router.refresh();
  }

  async function apagar(id: string) {
    if (!armado) {
      setArmado(true);
      setTimeout(() => setArmado(false), 3000);
      return;
    }
    setArmado(false);
    esquecer(id);
    setApps((xs) => xs.filter((a) => a.id !== id));
    setAberta(null);
    await rodar(() => removerAplicacao(id));
    router.refresh();
  }

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Aplicações" titulo={<>Quem quer <span className="text-red">entrar</span></>}
        texto="Chegam sozinhas do formulário do site. Leia, decida e, se aprovar, a pessoa vai para o CRM." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-1.5">
          {STATUS.map(({ k, t }) => {
            const n = apps.filter((a) => a.status === k).length;
            const on = filtro === k;
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => { setFiltro(k); setAberta(null); }}
                className={`min-h-[40px] border-[1.5px] px-3.5 text-[13px] font-bold ${on ? (k === "nova" ? "border-red bg-red text-white" : "border-ink bg-ink text-white") : "border-line bg-paper hover:border-ink"}`}>
                {t} {n > 0 && <span className="opacity-80">{n}</span>}
              </button>
            );
          })}
        </div>
        <StatusSalvo status={status} />
      </div>

      {apps.length === 0 ? (
        <div className="flex flex-col gap-2 border-[1.5px] border-dashed border-line p-6 text-sm text-muted">
          <p className="font-semibold text-ink">Nenhuma aplicação ainda.</p>
          <p>Quando o formulário do site estiver no ar, cada envio aparece aqui como &ldquo;Nova&rdquo;.</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-5">
          <ul aria-label="Lista de aplicações" className="flex min-w-0 flex-[1_1_280px] flex-col gap-1.5">
            {lista.length === 0 && <li className="border-[1.5px] border-dashed border-line p-5 text-sm text-muted">Nada aqui.</li>}
            {lista.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => setAberta(a.id)} aria-current={atual?.id === a.id ? "true" : undefined}
                  className={`flex w-full flex-col gap-1 border border-line border-l-4 bg-paper px-4 py-3 text-left hover:border-ink ${
                    a.status === "nova" ? "border-l-red" : "border-l-line-soft"} ${atual?.id === a.id ? "outline outline-2 outline-red" : ""}`}>
                  <span className="flex justify-between gap-2">
                    <strong className="min-w-0 text-[15px]">{a.apelido || a.contato || "sem nome"}</strong>
                    <span className="shrink-0 text-[12px] text-muted">{quando(a.created_at)}</span>
                  </span>
                  {a.interesse && <span className="text-[13px] text-muted">Interesse: {a.interesse}</span>}
                </button>
              </li>
            ))}
          </ul>

          {atual && (
            <section aria-labelledby="t-app" className="flex min-w-0 flex-[2_1_440px] flex-col gap-5 border border-line bg-paper p-5 md:p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="t-app" className="text-[24px] font-extrabold tracking-tight">{atual.apelido || "sem nome"}</h2>
                <span className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${SELO[atual.status][1]}`}>{SELO[atual.status][0]}</span>
              </div>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1"><dt className={ROTULO}>Contato</dt><dd className="break-words text-sm font-semibold">{atual.contato || "—"}</dd></div>
                <div className="flex flex-col gap-1"><dt className={ROTULO}>Interesse</dt><dd className="text-sm font-semibold">{atual.interesse || "—"}</dd></div>
                <div className="flex flex-col gap-1"><dt className={ROTULO}>Recebida</dt><dd className="text-sm font-semibold">{quando(atual.created_at)}</dd></div>
              </dl>
              {atual.respostas.length > 0 && (
                <div className="flex flex-col gap-3.5 border-t border-line-soft pt-4">
                  <span className={ROTULO}>Respostas do formulário</span>
                  {atual.respostas.map((r, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <strong className="text-sm">{r.pergunta}</strong>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{r.resposta || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex flex-col gap-1">
                <span className={ROTULO}>Nota interna</span>
                <textarea rows={2} value={atual.nota} placeholder="só a equipe vê"
                  onChange={(e) => alterar(atual.id, { nota: e.target.value })}
                  className="resize-y border-[1.5px] border-line p-2.5 text-sm outline-none focus:border-red" />
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {atual.contato_id ? (
                  <Link href={`/crm?c=${atual.contato_id}`} className={`${BOTAO} inline-flex items-center`}>Abrir no CRM</Link>
                ) : (
                  <button type="button" className={BOTAO} onClick={() => aprovar(atual)}>Aprovar e mandar ao CRM</button>
                )}
                {atual.status !== "analise" && atual.status !== "aprovada" && (
                  <button type="button" className={BOTAO_2} onClick={() => mudarStatus(atual.id, "analise")}>Em análise</button>
                )}
                {atual.status !== "recusada" && (
                  <button type="button" className="min-h-[44px] px-3 text-[13px] font-bold text-muted hover:text-red"
                    onClick={() => mudarStatus(atual.id, "recusada")}>Recusar</button>
                )}
                <button type="button" onClick={() => apagar(atual.id)}
                  className={`ml-auto min-h-[44px] px-3 text-[13px] font-bold ${armado ? "bg-red text-white" : "text-muted hover:text-red"}`}>
                  {armado ? "Apagar mesmo?" : "Apagar"}
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
