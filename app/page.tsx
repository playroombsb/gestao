import { listarTarefas } from "./actions";
import { listarAgenda, listarContatos } from "./actions-gestao";
import { exigirLogin } from "@/lib/auth";
import { PERFIL, carregarInsta } from "@/lib/instagram";
import { hoje, ordenar } from "@/lib/prazo";
import type { Insta } from "@/lib/types";
import Cabecalho, { PAGINA } from "@/components/Cabecalho";
import ProximasTarefas from "@/components/ProximasTarefas";
import AgendaSemana from "@/components/AgendaSemana";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";

function saudacao() {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

const mil = (n: number) => n.toLocaleString("pt-BR");

function Metrica({ rotulo, valor, nota, destaque }: { rotulo: string; valor: string; nota?: string; destaque?: boolean }) {
  return (
    <div className="flex flex-[1_1_140px] flex-col gap-1 bg-paper p-4">
      <span className="rotulo">{rotulo}</span>
      <span className="text-[24px] font-extrabold tracking-tight tabular-nums">{valor}</span>
      {nota && <span className={`text-[12px] ${destaque ? "font-bold text-red" : "text-muted"}`}>{nota}</span>}
    </div>
  );
}

function Instagram({ atual, antes }: { atual: Insta | null; antes: Insta | null }) {
  const delta = atual?.seguidores != null && antes?.seguidores != null ? atual.seguidores - antes.seguidores : null;
  const dias = atual && antes ? Math.round((Date.parse(atual.coletado_em) - Date.parse(antes.coletado_em)) / 86_400_000) : 0;
  return (
    <section aria-labelledby="t-insta" className="cartao flex min-w-0 flex-[1_1_320px] flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="t-insta" className="titulo-secao">Instagram</h2>
        <a href={`https://www.instagram.com/${PERFIL}/`} target="_blank" rel="noreferrer" className="btn-3 -mr-3 font-semibold">@{PERFIL}</a>
      </div>
      {!atual ? (
        <p className="rounded-xl border-[1.5px] border-dashed border-line p-5 text-[13px] text-muted">Ainda sem coleta. Os números chegam uma vez por semana.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-px overflow-hidden rounded-xl border border-line-soft bg-line-soft">
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
  const s = await exigirLogin();
  // Próximos 7 dias em Brasília, hoje incluído
  const dias = Array.from({ length: 7 }, (_, i) => new Date(Date.parse(hoje() + "T12:00:00Z") + i * 86_400_000).toISOString().slice(0, 10));
  const de = new Date(`${dias[0]}T00:00:00-03:00`).toISOString();
  const ate = new Date(Date.parse(`${dias[6]}T00:00:00-03:00`) + 86_400_000).toISOString();

  const [tarefas, contatos, agenda, insta] = await Promise.all([
    listarTarefas(), listarContatos(), listarAgenda(de, ate), carregarInsta().catch(() => null),
  ]);

  const abertas = tarefas.ok ? ordenar(tarefas.data.filter((t) => t.status !== "feito")) : [];
  const doCrm = contatos.ok
    ? contatos.data.filter((c) => c.data_hora && c.data_hora >= de && c.data_hora < ate && ["proposta", "agendado", "realizado"].includes(c.etapa))
    : [];
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

      {agenda.ok && contatos.ok
        ? <AgendaSemana dias={dias} contatos={doCrm} eventos={agenda.data} />
        : <p className="text-sm text-red">Não foi possível carregar a agenda.</p>}
    </main>
  );
}

