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
        className="min-h-[44px] min-w-0 flex-1 border-[1.5px] border-line bg-bg px-3 font-mono text-[12px] outline-none focus:border-red" />
      <button type="button" onClick={copiar}
        className="min-h-[44px] border-2 border-ink px-4 text-[13px] font-bold hover:bg-ink hover:text-white">
        {ok ?? "Copiar"}
      </button>
    </div>
  );
}
