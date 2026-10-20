"use client";

import Link from "next/link";
import { useState } from "react";
import { salvarTarefa } from "@/app/actions";
import { TOM_PRAZO, rotuloPrazo } from "@/lib/prazo";
import type { Tarefa } from "@/lib/types";

/** As próximas tarefas na página inicial. Marcar como feita tira da lista. */
export default function ProximasTarefas({ inicial, total }: { inicial: Tarefa[]; total: number }) {
  const [tarefas, setTarefas] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);

  async function concluir(t: Tarefa) {
    setTarefas((xs) => xs.filter((x) => x.id !== t.id));
    const r = await salvarTarefa(t.id, { feita: true });
    if (!r.ok) {
      setErro(r.erro);
      setTarefas((xs) => [...xs, t]);
    }
  }

  return (
    <section aria-labelledby="t-prox" className="flex min-w-0 flex-[1_1_420px] flex-col gap-3 border border-line bg-paper p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="t-prox" className="text-[20px] font-bold tracking-tight">Próximas 7 tarefas</h2>
        <Link href="/tarefas" className="text-[13px] font-bold hover:text-red">Ver todas ({total})</Link>
      </div>
      {tarefas.length === 0 ? (
        <p className="border-[1.5px] border-dashed border-line p-5 text-sm text-muted">Nada em aberto.</p>
      ) : (
        <ul className="flex flex-col">
          {tarefas.map((t) => {
            const r = rotuloPrazo(t.prazo);
            return (
              <li key={t.id} className="flex items-center gap-2 border-b border-line-soft py-1.5 last:border-0">
                <button type="button" role="checkbox" aria-checked={false} aria-label={`Marcar ${t.titulo} como feita`}
                  onClick={() => concluir(t)} className="flex h-11 w-11 shrink-0 items-center justify-center md:h-9 md:w-9">
                  <span className="h-5 w-5 border-2 border-line hover:border-red" />
                </button>
                <span className="min-w-0 flex-1 text-[15px] font-semibold">{t.titulo}</span>
                <span className={`shrink-0 text-[12px] ${TOM_PRAZO[r.tom]}`}>{r.t}</span>
              </li>
            );
          })}
        </ul>
      )}
      {erro && <p role="alert" className="text-sm font-semibold text-red">{erro}</p>}
    </section>
  );
}
