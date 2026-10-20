"use client";

import { useState } from "react";

/** Campo só de leitura com botão de copiar. */
export default function Copiar({ valor, rotulo }: { valor: string; rotulo: string }) {
  const [ok, setOk] = useState<string | null>(null);
  async function copiar() {
    try { await navigator.clipboard.writeText(valor); setOk("Copiado"); }
    catch { setOk("Não deu para copiar"); }
    setTimeout(() => setOk(null), 2000);
  }
  return (
    <div className="flex min-w-0 flex-wrap items-stretch gap-2">
      <input readOnly value={valor} aria-label={rotulo} onFocus={(e) => e.target.select()}
        className="caixa flex-1 bg-bg font-mono md:!text-[13px]" />
      <button type="button" onClick={copiar}
        className="btn-2">
        {ok ?? "Copiar"}
      </button>
    </div>
  );
}
