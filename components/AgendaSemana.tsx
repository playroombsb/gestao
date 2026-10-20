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
    <section aria-labelledby="t-agenda" className="flex flex-col gap-3 border border-line bg-paper p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="t-agenda" className="text-[20px] font-bold tracking-tight">Agenda dos próximos 7 dias</h2>
        <Link href="/calendario" className="text-[13px] font-bold hover:text-red">Abrir calendário</Link>
      </div>
      {itens.length === 0 && <p className="text-sm text-muted">Nada agendado nos próximos 7 dias.</p>}
      <ol className="flex flex-col">
        {dias.map((d) => {
          const doDia = itens.filter((i) => diaBR(i.inicio) === d);
          return (
            <li key={d} className="grid gap-x-4 gap-y-1 border-b border-line-soft py-2.5 last:border-0 sm:grid-cols-[150px_minmax(0,1fr)]">
              <span className={`text-sm font-bold ${d === dias[0] ? "text-red" : ""}`}>{nomeDia(d, dias[0])}</span>
              {doDia.length === 0 ? <span className="text-sm text-[#9a8e8c]">livre</span> : (
                <ul className="flex flex-col gap-1">
                  {doDia.map((i) => (
                    <li key={i.id}>
                      <Link href={i.href} className="flex flex-wrap items-center gap-x-3 gap-y-1 hover:text-red">
                        <span className="w-12 text-sm font-semibold tabular-nums">{horaBR(i.inicio)}</span>
                        <span className={`px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${COR_AGENDA[i.tipo].cor}`}>{COR_AGENDA[i.tipo].um}</span>
                        <span className="min-w-0 text-sm font-semibold">{i.titulo}</span>
                        {i.aConfirmar && <span className="text-[11px] font-semibold text-muted">a confirmar</span>}
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
