"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  criarUsuario, definirAdmin, encerrarSessoes, redefinirSenha, removerUsuario, renomearUsuario, type Usuario,
} from "@/app/actions-admin";
import Cabecalho, { BOTAO, BOTAO_2, PAGINA } from "./Cabecalho";

const ROTULO = "text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted";
const CAMPO = "w-full min-w-0 border-0 border-b-[1.5px] border-line-soft bg-transparent px-0.5 py-1.5 text-[15px] outline-none focus:border-red";

const desde = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default function Usuarios({ inicial, eu }: { inicial: Usuario[]; eu: string }) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState(inicial);
  const [msg, setMsg] = useState<{ t: string; erro?: boolean } | null>(null);
  const [novo, setNovo] = useState({ nome: "", login: "", senha: "", admin: false });
  const [senhas, setSenhas] = useState<Record<string, string>>({});
  const [aberto, setAberto] = useState<string | null>(null);
  const [armado, setArmado] = useState<string | null>(null);

  function avisar(r: { ok: boolean; erro?: string }, sucesso: string) {
    setMsg(r.ok ? { t: sucesso } : { t: r.erro ?? "Algo deu errado.", erro: true });
    return r.ok;
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
    if (avisar(r, `Senha de ${u.nome} trocada. Os logins abertos foram encerrados.`)) {
      setSenhas((s) => ({ ...s, [u.id]: "" }));
      setAberto(null);
    }
  }

  async function admin(u: Usuario) {
    const r = await definirAdmin(u.id, !u.admin);
    if (avisar(r, `${u.nome} ${u.admin ? "não é mais" : "agora é"} admin.`)) {
      setUsuarios((xs) => xs.map((x) => (x.id === u.id ? { ...x, admin: !u.admin } : x)));
      router.refresh();
    }
  }

  async function encerrar(u: Usuario) {
    avisar(await encerrarSessoes(u.id), u.id === eu ? "Seus outros logins foram encerrados." : `Logins de ${u.nome} encerrados.`);
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
    if (avisar(await renomearUsuario(u.id, nome), "Nome salvo.")) {
      setUsuarios((xs) => xs.map((x) => (x.id === u.id ? { ...x, nome: nome.trim() } : x)));
      router.refresh();
    }
  }

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Admin · Usuários" titulo={<>Quem <span className="text-red">entra</span></>}
        texto="Crie acessos, troque senhas e decida quem é admin. Admin vê esta área e as integrações." />

      {msg && (
        <p role="status" className={`px-4 py-3 text-sm font-semibold ${msg.erro ? "bg-red-soft text-red-deep" : "bg-ink text-white"}`}>{msg.t}</p>
      )}

      <section aria-label="Usuários" className="flex flex-col gap-2">
        {usuarios.map((u) => (
          <article key={u.id} className={`flex flex-col gap-3 border border-line border-l-4 bg-paper p-4 md:p-5 ${u.admin ? "border-l-red" : "border-l-ink"}`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <input defaultValue={u.nome} aria-label={`Nome de ${u.nome}`} onBlur={(e) => renomear(u, e.target.value)}
                className="campo min-w-[160px] flex-1 text-[18px] font-bold" />
              <span className="font-mono text-[13px] text-muted">usuário: {u.login}</span>
              {u.admin && <span className="bg-red px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Admin</span>}
              {u.id === eu && <span className="text-[12px] font-semibold text-muted">você</span>}
              <span className="text-[12px] text-muted">desde {desde(u.created_at)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={BOTAO_2} onClick={() => setAberto(aberto === u.id ? null : u.id)} aria-expanded={aberto === u.id}>
                Trocar senha
              </button>
              {u.id !== eu && (
                <button type="button" className={BOTAO_2} onClick={() => admin(u)}>{u.admin ? "Tirar admin" : "Tornar admin"}</button>
              )}
              <button type="button" className="min-h-[44px] px-3 text-[13px] font-bold text-muted hover:text-ink" onClick={() => encerrar(u)}>
                Encerrar logins
              </button>
              {u.id !== eu && (
                <button type="button" onClick={() => remover(u)}
                  className={`ml-auto min-h-[44px] px-3 text-[13px] font-bold ${armado === u.id ? "bg-red text-white" : "text-muted hover:text-red"}`}>
                  {armado === u.id ? "Remover mesmo?" : "Remover"}
                </button>
              )}
            </div>
            {aberto === u.id && (
              <form onSubmit={(e) => { e.preventDefault(); trocarSenha(u); }} className="flex flex-wrap items-end gap-3 border-t border-line-soft pt-3">
                <label className="flex flex-[1_1_220px] flex-col gap-1">
                  <span className={ROTULO}>Senha nova (mín. 8 caracteres)</span>
                  <input type="text" autoComplete="new-password" className={CAMPO} value={senhas[u.id] ?? ""}
                    onChange={(e) => setSenhas((s) => ({ ...s, [u.id]: e.target.value }))} />
                </label>
                <button type="submit" className={BOTAO}>Salvar senha</button>
              </form>
            )}
          </article>
        ))}
      </section>

      <form onSubmit={criar} aria-labelledby="t-novo" className="flex flex-col gap-4 border border-line border-t-4 border-t-red bg-paper p-5 md:p-6">
        <h2 id="t-novo" className="text-[20px] font-bold tracking-tight">Novo usuário</h2>
        <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
          <label className="flex flex-[1_1_200px] flex-col gap-1">
            <span className={ROTULO}>Nome</span>
            <input required className={CAMPO} value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          </label>
          <label className="flex flex-[1_1_160px] flex-col gap-1">
            <span className={ROTULO}>Usuário</span>
            <input required autoCapitalize="none" className={`${CAMPO} font-mono`} value={novo.login} placeholder="ex: maria"
              onChange={(e) => setNovo({ ...novo, login: e.target.value })} />
          </label>
          <label className="flex flex-[1_1_200px] flex-col gap-1">
            <span className={ROTULO}>Senha (mín. 8 caracteres)</span>
            <input required type="text" autoComplete="new-password" className={CAMPO} value={novo.senha}
              onChange={(e) => setNovo({ ...novo, senha: e.target.value })} />
          </label>
          <label className="flex min-h-[44px] items-center gap-2 text-sm">
            <input type="checkbox" checked={novo.admin} onChange={(e) => setNovo({ ...novo, admin: e.target.checked })} className="h-[18px] w-[18px] accent-ink" />
            Admin
          </label>
          <button type="submit" className={BOTAO}>Criar</button>
        </div>
      </form>
    </main>
  );
}
