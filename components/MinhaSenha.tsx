"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { trocarMinhaSenha } from "@/app/actions-admin";

/**
  Trocar a senha regrava o cookie de login, e o Next recarrega a página: o estado daqui se perde.
  Por isso a confirmação vem pela URL (?senha=trocada) e a página mostra a mensagem.
*/
export default function MinhaSenha({ trocada }: { trocada: boolean }) {
  const router = useRouter();
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
    setF({ atual: "", nova: "", repete: "" });
    router.replace("/conta?senha=trocada");
  }

  return (
    <form onSubmit={enviar} aria-labelledby="t-senha" className="cartao flex max-w-xl flex-col gap-4">
      <h2 id="t-senha" className="titulo-secao">Trocar minha senha</h2>
      <label className="flex flex-col gap-1">
        <span className="rotulo">Senha atual</span>
        <input type="password" required autoComplete="current-password" className="caixa" value={f.atual}
          onChange={(e) => setF({ ...f, atual: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="rotulo">Senha nova (mín. 8 caracteres)</span>
        <input type="password" required minLength={8} autoComplete="new-password" className="caixa" value={f.nova}
          onChange={(e) => setF({ ...f, nova: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="rotulo">Repita a senha nova</span>
        <input type="password" required autoComplete="new-password" className="caixa" value={f.repete}
          onChange={(e) => setF({ ...f, repete: e.target.value })} />
      </label>
      {!msg && trocada && <p role="status" className="text-[14px] font-medium text-ink">Senha trocada. Seus logins em outros aparelhos foram encerrados.</p>}
      {msg && <p role="status" className={`text-[14px] font-medium ${msg.erro ? "text-red" : "text-ink"}`}>{msg.t}</p>}
      <div><button type="submit" disabled={enviando} className="btn-1">{enviando ? "Salvando…" : "Trocar senha"}</button></div>
    </form>
  );
}
