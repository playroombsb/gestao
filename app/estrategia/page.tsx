import { exigirLogin } from "@/lib/auth";
import Cabecalho, { PAGINA } from "@/components/Cabecalho";

export const dynamic = "force-dynamic";

/*
  Mapa de fluxos do negócio (versão de 20/10/2026, feita a partir do "Mapa de Fluxos Sanara").
  As "Ideias e próximos passos" do mapa viraram tarefas na página Tarefas.
*/

const MESES = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
// alta temporada de sessões: jun, jul, nov, dez; maio em transição
const ALTA = new Set([5, 6, 10, 11]);
const TRANSICAO = 4;

const MONO = "font-mono text-[12px] tracking-[0.06em]";

function Produto({ n, nome, sub, voce, children }: {
  n: string; nome: string; sub?: string; voce?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 border-b border-line py-6 last:border-0 md:grid-cols-[150px_200px_minmax(0,1fr)] md:gap-6">
      <span className={`self-start justify-self-start rounded-lg border-2 border-ink px-3.5 py-2 text-[14px] font-bold ${voce ? "bg-ink text-white" : ""}`}>
        {n}
      </span>
      <div>
        <p className="flex items-center gap-2 text-[22px] font-bold tracking-tight"><span aria-hidden className="text-red">→</span>{nome}</p>
        {sub && <p className="pl-7 text-[14px] text-muted">{sub}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-3 text-[15px]">{children}</div>
    </div>
  );
}

const Chip = ({ children, forte }: { children: React.ReactNode; forte?: boolean }) => (
  <span className={`rounded px-2 py-1 ${MONO} ${forte ? "bg-red text-white" : "border border-ink"}`}>{children}</span>
);

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded bg-bg px-2 py-1 text-[13px]">{children}</span>
);

export default function Page() {
  exigirLogin();
  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Marketing · Mapa de fluxos do negócio" titulo="Playroom"
        texto="Ativo: marca. 5 produtos, funil e público." />

      {/* 01 */}
      <section aria-labelledby="t-01" className="flex flex-col gap-2">
        <h2 id="t-01" className="flex items-baseline gap-3 text-[26px] font-bold tracking-tight">
          <span className={`${MONO} text-red`}>01</span>Produtos e desafios
        </h2>
        <div className="border-l-[3px] border-red pl-4 md:pl-8">
          <Produto n="Produto · Você" nome="Sessões" voce>
            <p><strong>Desafios:</strong> estar disponível, disposta, saudável, sem sono; faxina recorrente.</p>
            <div className="flex flex-col gap-1">
              <div className="flex gap-1" role="img" aria-label="Temporada de sessões: alta em junho, julho, novembro e dezembro; maio em transição">
                {MESES.map((m, i) => (
                  <span key={i} className={`h-4 w-7 ${ALTA.has(i) ? "bg-red" : i === TRANSICAO ? "border-[1.5px] border-ink bg-paper" : "bg-line"}`} />
                ))}
              </div>
              <div aria-hidden className="flex gap-1">
                {MESES.map((m, i) => (
                  <span key={i} className={`w-7 text-center ${MONO} text-[11px] ${ALTA.has(i) ? "font-bold text-red" : "text-muted"}`}>{m}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-8">
              <p><span className="block text-[32px] font-extrabold leading-none text-red">25</span><span className="text-[13px] text-muted">sessões · alta</span></p>
              <p><span className="block text-[32px] font-extrabold leading-none">12</span><span className="text-[13px] text-muted">sessões · baixa</span></p>
            </div>
            <p className={`${MONO} text-red`}>↳ alimenta o Personagem Atrativo (03)</p>
          </Produto>

          <Produto n="Produto 2" nome="Aluguéis">
            <p><strong>Desafios:</strong> faxina recorrente; anúncios são barrados.</p>
            <div className="flex flex-wrap gap-2">
              <Chip>1h · R$160</Chip><Chip>3h · R$340</Chip><Chip>4h · R$420</Chip><Chip forte>faxina · −R$70</Chip>
            </div>
            <p><strong>Ideia:</strong> experiências Airbnb / blog.</p>
          </Produto>

          <Produto n="Produto 3" nome="Cursos" sub="presencial e online">
            <div className="flex flex-wrap gap-6">
              <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2.5">
                <p><strong>Workshops presenciais:</strong> cabem <strong className="text-red">12 pessoas</strong> · ticket médio <strong className="text-red">R$150</strong></p>
                <div className="flex flex-wrap gap-1.5">
                  <Tag>fireplay</Tag><Tag>spanking</Tag><Tag>introdução ao BDSM</Tag><Tag>negociação e etiqueta</Tag>
                </div>
                <p>Consultoria sobre BDSM em geral · Consultoria para outras profissionais · Cursos online (a definir)</p>
              </div>
              <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2 border-l-2 border-ink pl-4">
                <span className={`${MONO} font-bold`}>PRIORIDADE</span>
                <p><span className="mr-2 font-bold text-red">1</span>Workshops · Experience (mín. 200) · Produtos físicos</p>
                <p><span className="mr-2 font-bold text-red">2</span>Cursos online / aulas online</p>
              </div>
            </div>
          </Produto>

          <Produto n="Produto 4" nome="Eventos/Festas">
            <div className="flex flex-wrap items-start gap-6">
              <p className="flex-[1_1_220px]"><strong>Desafios:</strong> ansiedade, lugar/espaço, equipe.</p>
              <p><span className="block text-[32px] font-extrabold leading-none text-red">100h</span><span className="text-[13px] text-muted">média por evento</span></p>
              <p><span className="block text-[32px] font-extrabold leading-none">2</span><span className="text-[13px] text-muted">eventos por ano</span></p>
            </div>
          </Produto>

          <Produto n="Produto 5" nome="Sex shop">
            <p className="text-muted">Sem informações ainda.</p>
          </Produto>
        </div>
      </section>

      {/* 02 */}
      <section aria-labelledby="t-02" className="flex flex-col gap-5 border-t-2 border-ink pt-8">
        <h2 id="t-02" className="flex items-baseline gap-3 text-[26px] font-bold tracking-tight">
          <span className={`${MONO} text-red`}>02</span>Tempo
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="font-bold">Proporção ideal 70/30</p>
            <div className={`flex h-11 ${MONO} text-[14px] font-bold`}>
              <span className="flex w-[70%] items-center bg-ink px-3 text-white">70</span>
              <span className="flex w-[30%] items-center bg-red px-3 text-white">30</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-bold">Onde está meu tempo hoje</p>
            <div className={`flex h-11 ${MONO} text-[14px] font-bold`}>
              <span className="flex w-[60%] items-center bg-red px-3 text-white">60% atração</span>
              <span className="flex w-[40%] items-center border-2 border-ink px-3">40% entrega</span>
            </div>
          </div>
        </div>
      </section>

      {/* 03 */}
      <section aria-labelledby="t-03" className="flex flex-col gap-6 border-t-2 border-ink pt-8">
        <h2 id="t-03" className="flex items-baseline gap-3 text-[26px] font-bold tracking-tight">
          <span className={`${MONO} text-red`}>03</span>Funil, público e personagem
        </h2>
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-1.5">
            {[
              { n: 1, t: "Atração", d: "feed · conteúdo compartilhável", c: "bg-ink", w: "100%" },
              { n: 2, t: "Conexão", d: "você é o produto", c: "bg-[#3d3838]", w: "86%" },
              { n: 3, t: "Conversão", d: "fechamento", c: "bg-red", w: "72%" },
            ].map((e) => (
              <div key={e.n} style={{ width: e.w }}
                className={`${e.c} px-4 py-3.5 text-center text-[15px] text-white [clip-path:polygon(0_0,100%_0,94%_100%,6%_100%)]`}>
                <span className="mr-2 text-red-soft">{e.n}</span><strong>{e.t}</strong> · {e.d}
              </div>
            ))}
          </div>
          <div className="flex flex-col">
            <span className={`${MONO} pb-3 font-bold`}>GRUPOS DE CLIENTES</span>
            {[
              ["Sessão", "Em off: público que não vai em evento"],
              ["Experiência", "Público experimentalista"],
              ["Evento", "Amigos dos amigos"],
            ].map(([g, d]) => (
              <p key={g} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-t border-line py-3 text-[15px]">
                <strong className="text-red">{g}</strong><span>{d}</span>
              </p>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-lg border-2 border-red px-4 py-3">
            <p className="text-[18px] font-bold">Personagem Atrativo</p>
            <p className="text-[14px]">Pagar para estar perto de você</p>
            <p className="text-[14px] text-red">(mecanismo de seita)</p>
          </div>
          <span aria-hidden className="text-2xl text-red">→</span>
          <div className="flex min-w-[220px] flex-1 flex-col">
            <p className="border-b border-ink py-2 font-semibold">Persona pública</p>
            <p className="py-2 font-semibold">Elementos</p>
          </div>
        </div>
      </section>
    </main>
  );
}
