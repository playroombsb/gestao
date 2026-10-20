"use client";

import { useState } from "react";
import { trocarMinhaSenha } from "@/app/actions-admin";
import { BOTAO } from "./Cabecalho";

const ROTULO = "text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted";
const CAMPO = "w-full min-w-0 border-0 border-b-[1.5px] border-line-soft bg-transparent px-0.5 py-1.5 text-[15px] outline-none focus:border-red";

export default function MinhaSenha() {
  const [f, setF] = useState({ atual: "", nova: "", repete: "" });
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (f.nova !== f.repete) return setMsg({ t: "A senha nova e a repetição estão diferentes.", erro: true });
    setEnviando(true);
    const r = await trocarMinhaSenha(f.atual, f.nova);
    setEnviando(false);
    if (!r.ok) return setMsg({ t: r.erro, erro: true });
    setMsg({ t: "Senha trocada. Seus logins em outros aparelhos foram encerrados." });
    setF({ atual: "", nova: "", repete: "" });
  }

  return (
    <form onSubmit={enviar} aria-labelledby="t-senha" className="flex max-w-xl flex-col gap-4 border border-line bg-paper p-5 md:p-6">
      <h2 id="t-senha" className="text-[20px] font-bold tracking-tight">Trocar minha senha</h2>
      <label className="flex flex-col gap-1">
        <span className={ROTULO}>Senha atual</span>
        <input type="password" required autoComplete="current-password" className={CAMPO} value={f.atual}
          onChange={(e) => setF({ ...f, atual: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={ROTULO}>Senha nova (mín. 8 caracteres)</span>
        <input type="password" required minLength={8} autoComplete="new-password" className={CAMPO} value={f.nova}
          onChange={(e) => setF({ ...f, nova: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={ROTULO}>Repita a senha nova</span>
        <input type="password" required autoComplete="new-password" className={CAMPO} value={f.repete}
          onChange={(e) => setF({ ...f, repete: e.target.value })} />
      </label>
      {msg && <p role="status" className={`text-sm font-semibold ${msg.erro ? "text-red" : "text-ink"}`}>{msg.t}</p>}
      <div><button type="submit" disabled={enviando} className={BOTAO}>{enviando ? "Salvando…" : "Trocar senha"}</button></div>
    </form>
  );
}
