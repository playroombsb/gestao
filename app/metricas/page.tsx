import Link from "next/link";
import { listarContatos } from "../actions-gestao";
import { exigirLogin } from "@/lib/auth";
import { carregarSerieInsta, PERFIL } from "@/lib/instagram";
import { funil, PERIODOS, porOrigem, serieSeguidores, variacao, type Periodo } from "@/lib/metricas";
import { db } from "@/lib/supabase";
import Aviso from "@/components/Aviso";
import Cabecalho, { PAGINA } from "@/components/Cabecalho";
import GraficoSeguidores from "@/components/GraficoSeguidores";

export const dynamic = "force-dynamic";

const mil = (n: number) => n.toLocaleString("pt-BR");
const reais = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);

/** Quantas linhas de uma tabela foram criadas entre duas datas. */
async function contar(tabela: string, de: string, ate: string) {
  const { count } = await db().from(tabela).select("*", { count: "exact", head: true }).gte("created_at", de).lt("created_at", ate);
  return count ?? 0;
}

function Numero({ rotulo, valor, antes, nota }: { rotulo: string; valor: string; antes?: string; nota?: string }) {
  return (
    <div className="flex flex-[1_1_170px] flex-col gap-1 bg-paper p-4 md:p-5">
      <span className="rotulo">{rotulo}</span>
      <span className="text-[28px] font-bold leading-none tracking-tight tabular-nums">{valor}</span>
      {antes && <span className="text-[12px] text-muted">antes: {antes}</span>}
      {nota && <span className="text-[12px] text-muted">{nota}</span>}
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: { p?: string } }) {
  await exigirLogin();
  const periodo = PERIODOS.find((x) => x.k === searchParams.p) ?? PERIODOS[0];
  const agora = Date.now();
  const desde = new Date(agora - periodo.dias * 86_400_000).toISOString();
  const antesDe = new Date(agora - 2 * periodo.dias * 86_400_000).toISOString();
  const ate = new Date(agora + 60_000).toISOString();

  const [contatos, insta, apps, appsAntes, convs, convsAntes] = await Promise.all([
    listarContatos(), carregarSerieInsta().catch(() => []),
    contar("aplicacoes", desde, ate), contar("aplicacoes", antesDe, desde),
    contar("wa_conversas", desde, ate), contar("wa_conversas", antesDe, desde),
  ]);
  if (!contatos.ok) return <Aviso titulo="As métricas não carregaram." texto={contatos.erro} />;

  // Eventos têm pipeline próprio no CRM e ficam fora deste funil
  const atendimentos = contatos.data.filter((c) => c.tipo !== "evento");
  const doPeriodo = atendimentos.filter((c) => c.created_at >= desde);
  const doAnterior = atendimentos.filter((c) => c.created_at >= antesDe && c.created_at < desde);
  const etapas = funil(doPeriodo);
  const topo = etapas[0].n;
  const origens = porOrigem(doPeriodo);
  const realizados = doPeriodo.filter((c) => c.etapa === "realizado").length;
  const decididos = realizados + doPeriodo.filter((c) => c.etapa === "perdido").length;
  const serie = serieSeguidores(insta);
  const ultimo = serie[serie.length - 1];
  const delta = variacao(serie, desde);

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Marketing · Métricas" titulo={<>O que está <span className="text-red">funcionando</span></>}
        texto="Do primeiro contato à sessão realizada, mais o Instagram. Contatos contam pela data em que entraram no CRM." />

      <nav aria-label="Período" className="flex flex-wrap gap-1.5">
        {PERIODOS.map((x) => (
          <Link key={x.k} href={`/metricas?p=${x.k as Periodo}`} aria-pressed={x.k === periodo.k} className="pilula">{x.t}</Link>
        ))}
      </nav>

      <section aria-label="Resumo do período" className="flex flex-wrap gap-px overflow-hidden rounded-2xl border border-line-soft bg-line-soft">
        <Numero rotulo="Aplicações do site" valor={mil(apps)} antes={mil(appsAntes)} />
        <Numero rotulo="Conversas novas" valor={mil(convs)} antes={mil(convsAntes)} nota="no WhatsApp" />
        <Numero rotulo="Contatos no CRM" valor={mil(doPeriodo.length)} antes={mil(doAnterior.length)} />
        <Numero rotulo="Conversão" valor={pct(decididos ? realizados / decididos : null)}
          nota={decididos ? `${realizados} realizados de ${decididos} decididos` : "sem contatos decididos ainda"} />
        <Numero rotulo="Seguidores" valor={ultimo ? mil(ultimo.n) : "—"}
          nota={delta != null ? `${delta >= 0 ? "+" : ""}${mil(delta)} no período` : "variação aparece com 2 coletas no período"} />
      </section>
      <p className="-mt-4 text-[12px] text-muted">&ldquo;Antes&rdquo; é o mesmo número nos {periodo.t} anteriores.</p>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="t-funil" className="cartao flex min-w-0 flex-[1_1_380px] flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="t-funil" className="titulo-secao">Funil do CRM</h2>
            <p className="text-[13px] text-muted">Contatos do período que chegaram pelo menos até cada etapa. Perdidos ficam de fora.</p>
          </div>
          {topo === 0 ? (
            <p className="rounded-xl border-[1.5px] border-dashed border-line p-5 text-[13px] text-muted">Nenhum contato entrou no CRM neste período.</p>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {etapas.map((e) => (
                <li key={e.k} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-[13px]">
                  <span className="font-medium">{e.t}</span>
                  <span className="h-3 rounded-full bg-bg">
                    <span className="block h-3 rounded-full bg-red" style={{ width: `${Math.max(e.n ? 2 : 0, (e.n / topo) * 100)}%` }} />
                  </span>
                  <span className="w-16 text-right tabular-nums"><strong>{e.n}</strong> <span className="text-muted">{pct(e.n / topo)}</span></span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="t-insta" className="cartao flex min-w-0 flex-[1_1_380px] flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="t-insta" className="titulo-secao">Seguidores no Instagram</h2>
              <p className="text-[13px] text-muted">Uma coleta por semana, desde o início.</p>
            </div>
            <a href={`https://www.instagram.com/${PERFIL}/`} target="_blank" rel="noreferrer" className="btn-3 -mr-3 font-medium">@{PERFIL}</a>
          </div>
          <GraficoSeguidores serie={serie} />
        </section>
      </div>

      <section aria-labelledby="t-origem" className="cartao flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="t-origem" className="titulo-secao">De onde vêm os contatos</h2>
          <p className="text-[13px] text-muted">Pela origem marcada no CRM. Conversão = realizados sobre os já decididos (realizados mais perdidos).</p>
        </div>
        {origens.length === 0 ? (
          <p className="rounded-xl border-[1.5px] border-dashed border-line p-5 text-[13px] text-muted">Nenhum contato neste período.</p>
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-line-soft">
                  <th scope="col" className="rotulo px-1 pb-2 font-semibold">Origem</th>
                  <th scope="col" className="rotulo px-1 pb-2 text-right font-semibold">Contatos</th>
                  <th scope="col" className="rotulo px-1 pb-2 text-right font-semibold">Realizados</th>
                  <th scope="col" className="rotulo px-1 pb-2 text-right font-semibold">Conversão</th>
                  <th scope="col" className="rotulo px-1 pb-2 text-right font-semibold">Receita</th>
                </tr>
              </thead>
              <tbody>
                {origens.map((o) => (
                  <tr key={o.origem} className="border-b border-line-soft last:border-0">
                    <th scope="row" className="px-1 py-2.5 font-medium">{o.origem}</th>
                    <td className="px-1 py-2.5 text-right tabular-nums">{o.contatos}</td>
                    <td className="px-1 py-2.5 text-right tabular-nums">{o.realizados}</td>
                    <td className="px-1 py-2.5 text-right tabular-nums">{pct(o.conversao)}</td>
                    <td className="px-1 py-2.5 text-right tabular-nums">{o.receita ? reais(o.receita) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
