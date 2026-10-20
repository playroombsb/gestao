"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { sair } from "@/app/login/actions";

type Item = { href: string; t: string; badge?: number };
type Grupo = { nome?: string; itens: Item[] };

export default function Nav({ nome, novas, admin }: { nome: string; novas: number; admin: boolean }) {
  const atual = usePathname();
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [atual]);

  const grupos: Grupo[] = [
    { itens: [{ href: "/", t: "Início" }, { href: "/tarefas", t: "Tarefas" }, { href: "/calendario", t: "Calendário" }, { href: "/aplicacoes", t: "Aplicações", badge: novas }] },
    { nome: "Marketing", itens: [
      { href: "/estrategia", t: "Estratégia" }, { href: "/posicionamento", t: "Posicionamento" }, { href: "/editorial", t: "Linha editorial" },
    ] },
    { nome: "Gestão", itens: [{ href: "/crm", t: "CRM" }, { href: "/produtos", t: "Produtos" }, { href: "/financeiro", t: "Financeiro" }] },
    ...(admin ? [{ nome: "Admin", itens: [{ href: "/admin/usuarios", t: "Usuários" }, { href: "/integracoes", t: "Integrações" }] }] : []),
  ];

  const ativo = (href: string) => (href === "/" ? atual === "/" : atual === href || atual.startsWith(href + "/"));

  return (
    <aside className="z-20 shrink-0 bg-ink bg-[linear-gradient(165deg,#2b1216_0%,#150c0d_35%,#0d0a0a_70%)] pt-[env(safe-area-inset-top)] text-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:flex-col md:overflow-y-auto md:pt-0">
      <div className="flex items-center justify-between px-4 py-3 md:px-7 md:pb-6 md:pt-8">
        <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-red-vivo">Playroom</span>
        <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} aria-controls="menu-principal"
          className="min-h-[44px] rounded-lg px-3 text-[14px] font-bold hover:bg-white/10 md:hidden">
          {aberto ? "Fechar" : "Menu"}
        </button>
      </div>

      <nav id="menu-principal" aria-label="Menu principal"
        className={`${aberto ? "flex" : "hidden"} flex-1 flex-col gap-0.5 border-t border-side-line px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 md:flex md:border-0 md:px-4 md:pt-0`}>
        {grupos.map((g, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {g.nome && <span className="mt-4 px-3 pb-1.5 pt-2 text-[12px] font-bold uppercase tracking-[0.14em] text-side-label">{g.nome}</span>}
            {g.itens.map(({ href, t, badge }) => {
              const on = ativo(href);
              return (
                <Link key={href} href={href} aria-current={on ? "page" : undefined}
                  className={`flex min-h-[40px] items-center justify-between gap-2 rounded-lg pr-3 text-[14px] transition-colors toque:min-h-[44px] ${g.nome ? "pl-6" : "pl-3"} ${
                    on ? "bg-red font-bold text-white" : "font-semibold text-side-text hover:bg-white/5 hover:text-white"}`}>
                  {t}
                  {!!badge && (
                    <span className={`min-w-[22px] rounded-full px-1.5 py-0.5 text-center text-[12px] font-bold ${on ? "bg-white text-red" : "bg-red text-white"}`}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        <form action={sair} className="mt-auto flex items-center justify-between gap-2 border-t border-side-line pt-3 text-[14px]">
          <Link href="/conta" aria-current={atual === "/conta" ? "page" : undefined}
            className={`flex min-h-[40px] min-w-0 flex-1 items-center truncate rounded-lg px-3 hover:bg-white/5 hover:text-white toque:min-h-[44px] ${atual === "/conta" ? "bg-white/10 font-bold text-white" : "text-side-text"}`}>
            {nome}
          </Link>
          <button type="submit" className="min-h-[40px] rounded-lg px-3 font-bold text-white hover:bg-white/10 hover:text-red-vivo toque:min-h-[44px]">Sair</button>
        </form>
      </nav>
    </aside>
  );
}
