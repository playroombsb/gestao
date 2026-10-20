"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  criarUsuario, definirAdmin, encerrarSessoes, redefinirSenha, removerUsuario, renomearUsuario, type Usuario,
} from "@/app/actions-admin";
import Cabecalho, { PAGINA } from "./Cabecalho";


const desde = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default function Usuarios({ inicial, eu, aviso }: { inicial: Usuario[]; eu: string; aviso?: string }) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState(inicial);
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(aviso ? { t: aviso } : null);
  const [novo, setNovo] = useState({ nome: "", login: "", senha: "", admin: false });
  const [senhas, setSenhas] = useState<Record<string, string>>({});
  const [aberto, setAberto] = useState<string | null>(null);
  const [armado, setArmado] = useState<string | null>(null);

  function avisar(r: { ok: boolean; erro?: string }, sucesso: string) {
    setMsg(r.ok ? { t: sucesso } : { t: r.erro ?? "Algo deu errado.", erro: true });
    return r.ok;
  }

  // Mexer na própria senha ou nos próprios logins regrava o cookie e o Next recarrega a página:
  // a mensagem vai pela URL para não se perder.
  function avisarProprio(sucesso: string) {
    router.replace(`/admin/usuarios?aviso=${encodeURIComponent(sucesso)}`);
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    const r = await criarUsuario(novo.nome, novo.login, novo.senha, novo.admin);
    if (!avisar(r, `${novo.nome.trim()} foi criado. Passe o usuário e a senha para a pessoa.`) || !r.ok) return;
    setUsuarios((xs) => [...xs, r.data]);
    setNovo({ nome: "", login: "", senha: "", admin: false });
  }

  async function trocarSenha(u: Usuario) {
    const r = await redefinirSenha(u.id, senhas[u.id] ?? "");
    if (r.ok && u.id === eu) return avisarProprio("Sua senha foi trocada. Seus outros logins foram encerrados.");
    if (avisar(r, `Senha de ${u.nome} trocada. Os logins abertos foram encerrados.`)) {
      setSenhas((s) => ({ ...s, [u.id]: "" }));
      setAberto(null);
    }
  }

  async function admin(u: Usuario) {
    const r = await definirAdmin(u.id, !u.admin);
    if (avisar(r, `${u.nome} ${u.admin ? "não é mais" : "agora é"} admin.`)) {
      setUsuarios((xs) => xs.map((x) => (x.id === u.id ? { ...x, admin: !u.admin } : x)));
    }
  }

  async function encerrar(u: Usuario) {
    const r = await encerrarSessoes(u.id);
    if (r.ok && u.id === eu) return avisarProprio("Seus outros logins foram encerrados.");
    avisar(r, `Logins de ${u.nome} encerrados.`);
  }

  async function remover(u: Usuario) {
    if (armado !== u.id) {
      setArmado(u.id);
      setTimeout(() => setArmado((a) => (a === u.id ? null : a)), 3000);
      return;
    }
    setArmado(null);
    if (avisar(await removerUsuario(u.id), `${u.nome} foi removido.`)) setUsuarios((xs) => xs.filter((x) => x.id !== u.id));
  }

  async function renomear(u: Usuario, nome: string) {
    if (nome.trim() === u.nome || !nome.trim()) return;
    const r = await renomearUsuario(u.id, nome);
    // O próprio nome aparece no menu: recarrega com a mensagem na URL
    if (r.ok && u.id === eu) return avisarProprio("Nome salvo.");
    if (avisar(r, "Nome salvo.")) setUsuarios((xs) => xs.map((x) => (x.id === u.id ? { ...x, nome: nome.trim() } : x)));
  }

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Admin · Usuários" titulo={<>Quem <span className="text-red">entra</span></>}
        texto="Crie acessos, troque senhas e decida quem é admin. Admin vê esta área e as integrações." />

      {msg && (
        <p role="status" className={`rounded-xl px-4 py-3 text-[14px] font-semibold ${msg.erro ? "bg-red-soft text-red-deep" : "bg-ink text-white"}`}>{msg.t}</p>
      )}

      <section aria-label="Usuários" className="flex flex-col gap-2">
        {usuarios.map((u) => (
          <article key={u.id} className="cartao flex flex-col gap-3 !p-4 md:!p-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <input defaultValue={u.nome} aria-label={`Nome de ${u.nome}`} onBlur={(e) => renomear(u, e.target.value)}
                className="campo min-w-[160px] flex-1 font-bold md:!text-[16px]" />
              <span className="font-mono text-[13px] text-muted">usuário: {u.login}</span>
              {u.admin && <span className="selo bg-red text-white">Admin</span>}
              {u.id === eu && <span className="text-[13px] font-semibold text-muted">você</span>}
              <span className="text-[13px] text-muted">desde {desde(u.created_at)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-2" onClick={() => setAberto(aberto === u.id ? null : u.id)} aria-expanded={aberto === u.id}>
                Trocar senha
              </button>
              {u.id !== eu && (
                <button type="button" className="btn-2" onClick={() => admin(u)}>{u.admin ? "Tirar admin" : "Tornar admin"}</button>
              )}
              <button type="button" className="btn-3" onClick={() => encerrar(u)}>
                Encerrar logins
              </button>
              {u.id !== eu && (
                <button type="button" onClick={() => remover(u)}
                  className={`ml-auto ${armado === u.id ? "btn-perigo" : "btn-3 hover:!text-red"}`}>
                  {armado === u.id ? "Remover mesmo?" : "Remover"}
                </button>
              )}
            </div>
            {aberto === u.id && (
              <form onSubmit={(e) => { e.preventDefault(); trocarSenha(u); }} className="flex flex-wrap items-end gap-3 border-t border-line-soft pt-3">
                <label className="flex flex-[1_1_220px] flex-col gap-1">
                  <span className="rotulo">Senha nova (mín. 8 caracteres)</span>
                  <input type="text" autoComplete="new-password" className="caixa" value={senhas[u.id] ?? ""}
                    onChange={(e) => setSenhas((s) => ({ ...s, [u.id]: e.target.value }))} />
                </label>
                <button type="submit" className="btn-1">Salvar senha</button>
              </form>
            )}
          </article>
        ))}
      </section>

      <form onSubmit={criar} aria-labelledby="t-novo" className="cartao flex flex-col gap-4">
        <h2 id="t-novo" className="titulo-secao">Novo usuário</h2>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-4">
          <label className="flex flex-[1_1_200px] flex-col gap-1">
            <span className="rotulo">Nome</span>
            <input required className="caixa" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          </label>
          <label className="flex flex-[1_1_160px] flex-col gap-1">
            <span className="rotulo">Usuário</span>
            <input required autoCapitalize="none" className={`caixa font-mono`} value={novo.login} placeholder="ex: maria"
              onChange={(e) => setNovo({ ...novo, login: e.target.value })} />
          </label>
          <label className="flex flex-[1_1_200px] flex-col gap-1">
            <span className="rotulo">Senha (mín. 8 caracteres)</span>
            <input required type="text" autoComplete="new-password" className="caixa" value={novo.senha}
              onChange={(e) => setNovo({ ...novo, senha: e.target.value })} />
          </label>
          <label className="flex min-h-[40px] items-center gap-2.5 text-[14px] toque:min-h-[44px]">
            <input type="checkbox" checked={novo.admin} onChange={(e) => setNovo({ ...novo, admin: e.target.checked })} className="h-[18px] w-[18px] accent-ink" />
            Admin
          </label>
          <button type="submit" className="btn-1">Criar</button>
        </div>
      </form>
    </main>
  );
}
