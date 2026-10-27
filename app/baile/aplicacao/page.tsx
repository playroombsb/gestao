import type { Metadata } from "next";
import AplicacaoEvento from "@/components/AplicacaoEvento";
import { eventoAberto, proximoEvento, quando } from "@/lib/evento-publico";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Formulário de participação · O Baile dos Condenados",
  description: "Aplicação para a Play Party do Playroom em Brasília. 18+.",
  robots: { index: false },
};

/**
  baile.playroombsb.com.br/aplicacao: formulário de participação numa página só dele, pensado primeiro
  para o celular (decisão da Ana em 27/10/2026). Os cards de ingresso da página inicial abrem aqui com
  ?ingresso=1|2|3 já marcado. Sem ?evento=<id> vale a próxima festa do calendário (é o link que o CRM copia).
  A aplicação cai no pipeline do evento, fila Aplicação.
*/
export default async function Page({ searchParams }: { searchParams: { ingresso?: string; evento?: string } }) {
  const ev = searchParams.evento ? await eventoAberto(searchParams.evento) : await proximoEvento();
  const ingresso = ["1", "2", "3"].includes(searchParams.ingresso ?? "") ? searchParams.ingresso : undefined;
  const q = ev ? quando(ev.inicio) : null;

  return (
    <main className="flex flex-1 flex-col bg-[linear-gradient(180deg,#101012,#060607)]">
      <header className="flex items-center justify-between gap-4 px-5 py-5 md:px-[clamp(20px,3vw,38px)] md:py-7">
        <a href="/" aria-label="Voltar para o site da festa" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/baile/logo-branco.png" alt="Playroom" className="block h-12 w-auto md:h-16" />
        </a>
        <a href="/" className="inline-flex min-h-[44px] items-center text-[15px] text-[#9a9ea6] transition-colors hover:text-white">
          ← Voltar
        </a>
      </header>

      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-8 px-5 pb-[max(64px,env(safe-area-inset-bottom))] pt-6 md:pb-[120px] md:pt-14">
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[13px] font-semibold tracking-[.2em] text-[#ff2a44]">
            {(ev?.titulo || "Play Party").toUpperCase()} · 18+
          </p>
          <h1 className="m-0 text-[clamp(34px,9vw,46px)] font-normal leading-[1.05]">Formulário de participação</h1>
          <p className="m-0 text-[17px] font-light leading-[1.6] text-[#9a9ea6]">
            Preencha e aguarde o retorno da Mistress Sandra pelo WhatsApp. O pagamento só acontece depois da aprovação.
          </p>
          {q && <p className="m-0 text-[15px] text-white">{q.dia}, {q.hora}</p>}
        </div>

        {!ev
          ? <p className="border border-[#2a2a2d] bg-[#0d0d0e] p-6 text-[15px]">A próxima festa ainda não tem data.</p>
          : ev.encerrado
            ? <p className="border border-[#2a2a2d] bg-[#0d0d0e] p-6 text-[15px]">As aplicações para esta festa já foram encerradas.</p>
            : <AplicacaoEvento eventoId={ev.id} escuro ingressoInicial={ingresso} />}
      </div>
    </main>
  );
}
