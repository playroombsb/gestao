"use client";

import Link from "next/link";
import { useState } from "react";
import { salvarTarefa } from "@/app/actions";
import { prazoCurto } from "@/lib/prazo";
import type { Tarefa } from "@/lib/types";

/** As próximas tarefas na página inicial. Marcar como feita move para "Feito" e tira da lista. */
export default function ProximasTarefas({ inicial, total }: { inicial: Tarefa[]; total: number }) {
  const [tarefas, setTarefas] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);

  async function concluir(t: Tarefa) {
    setTarefas((xs) => xs.filter((x) => x.id !== t.id));
    const r = await salvarTarefa(t.id, { status: "feito" });
    if (!r.ok) {
      setErro(r.erro);
      setTarefas((xs) => [...xs, t]);
    }
  }

  return (
    <section aria-labelledby="t-prox" className="cartao flex min-w-0 flex-[1_1_420px] flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id="t-prox" className="titulo-secao">Próximas 7 tarefas</h2>
        <Link href="/tarefas" className="btn-3 -mr-3">Ver todas ({total})</Link>
      </div>
      {tarefas.length === 0 ? (
        <p className="rounded-xl border-[1.5px] border-dashed border-line p-5 text-[13px] text-muted">Nada em aberto.</p>
      ) : (
        <ul className="flex flex-col">
          {tarefas.map((t) => {
            const r = prazoCurto(t.prazo);
            return (
              <li key={t.id} className="flex items-center gap-2 border-b border-line-soft py-1 last:border-0">
                <button type="button" role="checkbox" aria-checked={false} aria-label={`Marcar ${t.titulo} como feita`}
                  onClick={() => concluir(t)} className="flex h-9 w-9 shrink-0 items-center justify-center toque:h-11 toque:w-11">
                  <span className="h-5 w-5 rounded-full border-2 border-line hover:border-red" />
                </button>
                <span className="min-w-0 flex-1 text-[15px] font-medium">{t.titulo}</span>
                <span className={`shrink-0 text-[13px] font-medium ${r.tom === "atrasada" ? "text-red" : r.tom === "sem" ? "text-apagado" : "text-ink"}`}>{r.t}</span>
              </li>
            );
          })}
        </ul>
      )}
      {erro && <p role="alert" className="text-[13px] font-medium text-red">{erro}</p>}
    </section>
  );
}
