import { notFound } from "next/navigation";
import { eventoAberto, quando } from "@/lib/evento-publico";
import AplicacaoEvento from "@/components/AplicacaoEvento";

export const dynamic = "force-dynamic";

/** Página pública (sem login) com o formulário de aplicação de um evento do calendário. */
export default async function Page({ params }: { params: { id: string } }) {
  const ev = await eventoAberto(params.id);
  if (!ev) notFound();
  const { dia, hora } = quando(ev.inicio);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-7 px-4 py-10 md:py-14">
      <header className="flex flex-col gap-3 border-b-2 border-red pb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-red">Playroom · Aplicação</p>
        <h1 className="text-[32px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[40px]">{ev.titulo || "Play Party"}</h1>
        <p className="text-[15px] text-muted">
          {dia}, {hora}{ev.local ? ` · ${ev.local}` : ""}
        </p>
      </header>
      {ev.encerrado
        ? <p className="cartao text-[15px]">As aplicações para este evento já foram encerradas.</p>
        : <AplicacaoEvento eventoId={ev.id} />}
    </main>
  );
}
