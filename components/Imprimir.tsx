"use client";

import { useEffect } from "react";

/** Abre a janela de impressão ao carregar e deixa um botão para repetir. Some na impressão. */
export default function Imprimir() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-bg p-4 text-[14px] print:hidden">
      <span>Na janela que abriu, escolha <strong>Salvar como PDF</strong>.</span>
      <button type="button" onClick={() => window.print()} className="btn-1">Salvar PDF</button>
    </div>
  );
}
