import Link from "next/link";
import { listarTarefas } from "./actions";
import { listarContatos } from "./actions-gestao";
import { exigirLogin } from "@/lib/auth";
import { brl } from "@/lib/calc";
import { dataHora, resumoCrm } from "@/lib/crm";
import { PERFIL, carregarInsta } from "@/lib/instagram";
import { hoje, ordenar } from "@/lib/prazo";
import type { Insta } from "@/lib/types";
import Cabecalho, { PAGINA } from "@/components/Cabecalho";
import ProximasTarefas from "@/components/ProximasTarefas";
import Tipo from "@/components/Tipo";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";
const ROTULO = "text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted";

function saudacao() {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

const mil = (n: number) => n.toLocaleString("pt-BR");

function Metrica({ rotulo, valor, nota, destaque }: { rotulo: string; valor: string; nota?: string; destaque?: boolean }) {
  return (
    <div className="flex flex-[1_1_140px] flex-col gap-1 bg-paper p-4">
      <span className={ROTULO}>{rotulo}</span>
      <span className="text-[26px] font-extrabold tracking-tight tabular-nums">{valor}</span>
      {nota && <span className={`text-[12px] ${destaque ? "font-bold text-red" : "text-muted"}`}>{nota}</span>}
    </div>
  );
}

function Instagram({ atual, antes }: { atual: Insta | null; antes: Insta | null }) {
  const delta = atual?.seguidores != null && antes?.seguidores != null ? atual.seguidores - antes.seguidores : null;
  const dias = atual && antes ? Math.round((Date.parse(atual.coletado_em) - Date.parse(antes.coletado_em)) / 86_400_000) : 0;
  return (
    <section aria-labelledby="t-insta" className="flex min-w-0 flex-[1_1_320px] flex-col gap-3 border border-line bg-paper p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="t-insta" className="text-[20px] font-bold tracking-tight">Instagram</h2>
        <a href={`https://www.instagram.com/${PERFIL}/`} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-muted hover:text-red">@{PERFIL}</a>
      </div>
      {!atual ? (
        <p className="border-[1.5px] border-dashed border-line p-5 text-sm text-muted">Ainda sem coleta. Os números chegam uma vez por dia.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-px border border-line-soft bg-line-soft">
            <Metrica rotulo="Seguidores" valor={atual.seguidores != null ? mil(atual.seguidores) : "—"}
              nota={delta != null ? `${delta >= 0 ? "+" : ""}${mil(delta)} em ${dias} ${dias === 1 ? "dia" : "dias"}` : "variação aparece após a 2ª coleta"} destaque={!!delta} />
            {atual.posts != null && <Metrica rotulo="Posts" valor={mil(atual.posts)}
              nota={atual.posts_30d != null ? `${atual.posts_30d} nos últimos 30 dias` : "no total"} />}
            {atual.seguindo != null && <Metrica rotulo="Seguindo" valor={mil(atual.seguindo)} />}
            {/* Curtidas e engajamento só vêm quando o perfil não é restrito para quem não está logado */}
            {atual.engajamento != null && <Metrica rotulo="Engajamento" valor={`${atual.engajamento.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
              nota={atual.media_curtidas != null ? `${mil(Math.round(atual.media_curtidas))} curtidas por post` : undefined} />}
          </div>
          <p className="text-[12px] text-muted">
            Coletado em {new Date(atual.coletado_em).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </p>
        </>
      )}
    </section>
  );
}

export default async function Page() {
  const s = exigirLogin();
  const [tarefas, contatos, insta] = await Promise.all([listarTarefas(), listarContatos(), carregarInsta().catch(() => null)]);

  const abertas = tarefas.ok ? ordenar(tarefas.data.filter((t) => t.status !== "feito")) : [];
  const crm = contatos.ok ? resumoCrm(contatos.data) : null;
  const data = new Date().toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Playroom · Brasília" titulo={`${saudacao()}, ${s.nome}`} texto={data.charAt(0).toUpperCase() + data.slice(1)} />

      <div className="flex flex-wrap items-start gap-6">
        {tarefas.ok
          ? <ProximasTarefas key={hoje()} inicial={abertas.slice(0, 7)} total={abertas.length} />
          : <p className="text-sm text-red">{tarefas.erro}</p>}
        <Instagram atual={insta?.atual ?? null} antes={insta?.antes ?? null} />
      </div>

      <section aria-labelledby="t-crm" className="flex flex-col gap-5 border border-line bg-paper p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="t-crm" className="text-[20px] font-bold tracking-tight">Sessões e aluguéis</h2>
          <Link href="/crm" className="text-[13px] font-bold hover:text-red">Abrir CRM</Link>
        </div>
        {!crm ? <p className="text-sm text-red">Não foi possível carregar o CRM.</p> : (
          <>
            <div className="flex flex-wrap gap-2">
              {([["novo", "Novo contato", "border-line"], ["conversa", "Conversa", "border-line"], ["proposta", "Proposta", "border-line"],
                ["agendado", "Agendado", "border-ink"]] as const).map(([k, t, cor]) => (
                <div key={k} className={`flex flex-[1_1_120px] flex-col gap-0.5 border-t-[3px] ${cor} pt-2.5`}>
                  <span className={ROTULO}>{t}</span>
                  <span className="text-[24px] font-extrabold tabular-nums">{crm.porEtapa(k)}</span>
                </div>
              ))}
              <div className="flex flex-[1_1_160px] flex-col gap-0.5 border-t-[3px] border-red pt-2.5">
                <span className={ROTULO}>Realizado no mês</span>
                <span className="text-[24px] font-extrabold tabular-nums">{brl(crm.realizadoMes)}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className={`${ROTULO} pb-1`}>Próximos agendamentos</span>
              {crm.proximos.length === 0 ? (
                <p className="py-2 text-sm text-muted">Nenhum agendamento pela frente.</p>
              ) : crm.proximos.slice(0, 5).map((c) => (
                <Link key={c.id} href={`/crm?c=${c.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line-soft py-2.5 last:border-0 hover:bg-bg">
                  <span className="w-[130px] text-sm font-bold">{dataHora(c.data_hora)}</span>
                  <Tipo tipo={c.tipo} />
                  <span className="min-w-0 flex-1 text-sm">{c.apelido || "sem apelido"}</span>
                  <span className="text-sm font-bold tabular-nums">{c.valor != null ? brl(c.valor) : ""}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

