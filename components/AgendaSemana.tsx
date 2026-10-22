import Link from "next/link";
import { COR_AGENDA, horaBR, type TipoAgenda } from "@/lib/agenda";
import { diaBR } from "@/lib/crm";
import type { Contato, Evento } from "@/lib/types";

type Item = { id: string; tipo: TipoAgenda; titulo: string; inicio: string; href: string; aConfirmar: boolean };

function nomeDia(dia: string, hoje: string) {
  const amanha = new Date(Date.parse(hoje + "T12:00:00Z") + 86_400_000).toISOString().slice(0, 10);
  if (dia === hoje) return "Hoje";
  if (dia === amanha) return "Amanhã";
  const t = new Date(dia + "T12:00:00Z").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "UTC" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Agenda dos próximos 7 dias (hoje incluído): CRM e compromissos do calendário, dia a dia. */
export default function AgendaSemana({ dias, contatos, eventos }: { dias: string[]; contatos: Contato[]; eventos: Evento[] }) {
  const itens: Item[] = [
    ...contatos.map((c) => ({
      id: c.id, tipo: c.tipo as TipoAgenda, titulo: c.apelido || "sem apelido", inicio: c.data_hora!,
      href: `/crm?c=${c.id}`, aConfirmar: c.etapa === "proposta",
    })),
    ...eventos.map((e) => ({
      id: e.id, tipo: e.tipo as TipoAgenda, titulo: e.titulo || "sem título", inicio: e.inicio,
      href: `/calendario?mes=${diaBR(e.inicio).slice(0, 7)}`, aConfirmar: false,
    })),
  ].sort((a, b) => a.inicio.localeCompare(b.inicio));

  return (
    <section aria-labelledby="t-agenda" className="cartao flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="t-agenda" className="titulo-secao">Agenda dos próximos 7 dias</h2>
        <Link href="/calendario" className="btn-3 -mr-3">Abrir calendário</Link>
      </div>
      {itens.length === 0 && <p className="text-[13px] text-muted">Nada agendado nos próximos 7 dias.</p>}
      <ol className="flex flex-col">
        {dias.map((d) => {
          const doDia = itens.filter((i) => diaBR(i.inicio) === d);
          return (
            <li key={d} className="grid gap-x-4 gap-y-1 border-b border-line-soft py-2.5 last:border-0 sm:grid-cols-[150px_minmax(0,1fr)]">
              <span className={`text-[14px] font-semibold ${d === dias[0] ? "text-red" : ""}`}>{nomeDia(d, dias[0])}</span>
              {doDia.length === 0 ? <span className="text-[14px] text-apagado">livre</span> : (
                <ul className="flex flex-col gap-1">
                  {doDia.map((i) => (
                    <li key={i.id}>
                      <Link href={i.href} className="-mx-2 flex min-h-[36px] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 hover:bg-bg toque:min-h-[44px]">
                        <span className="w-12 text-[14px] font-medium tabular-nums">{horaBR(i.inicio)}</span>
                        <span className={`selo ${COR_AGENDA[i.tipo].cor}`}>{COR_AGENDA[i.tipo].um}</span>
                        <span className="min-w-0 text-[14px] font-medium">{i.titulo}</span>
                        {i.aConfirmar && <span className="text-[12px] font-medium text-muted">a confirmar</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
