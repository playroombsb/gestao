"use client";

import { useCallback, useRef, useState } from "react";

export type Status = { t: string; tom?: "ok" | "erro" };
type Res = { ok: true } | { ok: false; erro: string };

/** Junta as alterações de cada item e salva 700 ms depois que a pessoa para de digitar. */
export function useAutosave<P extends object>(salvar: (id: string, patch: P) => Promise<Res>) {
  const [status, setStatus] = useState<Status>({ t: "Tudo salvo", tom: "ok" });
  const pendentes = useRef<Record<string, { timer: ReturnType<typeof setTimeout>; patch: P }>>({});

  const rodar = useCallback(async <R extends Res>(acao: () => Promise<R>) => {
    setStatus({ t: "Salvando…" });
    const r = await acao();
    setStatus(r.ok ? { t: "Salvo", tom: "ok" } : { t: r.erro, tom: "erro" });
    return r;
  }, []);

  const agendar = useCallback((id: string, patch: P, imediato = false) => {
    const atual = pendentes.current[id];
    if (atual) clearTimeout(atual.timer);
    const acumulado = { ...(atual?.patch ?? {}), ...patch } as P;
    const gravar = () => {
      delete pendentes.current[id];
      void rodar(() => salvar(id, acumulado));
    };
    if (imediato) return gravar();
    setStatus({ t: "Editando…" });
    pendentes.current[id] = { patch: acumulado, timer: setTimeout(gravar, 700) };
  }, [rodar, salvar]);

  /** Item removido: descarta o que estava para salvar nele. */
  const esquecer = useCallback((id: string) => {
    const atual = pendentes.current[id];
    if (atual) clearTimeout(atual.timer);
    delete pendentes.current[id];
  }, []);

  return { status, rodar, agendar, esquecer };
}
