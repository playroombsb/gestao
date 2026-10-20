"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { sair } from "@/app/login/actions";

type Item = { href: string; t: string; badge?: number };
type Grupo = { nome?: string; itens: Item[] };

export default function Nav({ nome, novas }: { nome: string; novas: number }) {
  const atual = usePathname();
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [atual]);

  const grupos: Grupo[] = [
    { itens: [{ href: "/", t: "Início" }, { href: "/calendario", t: "Calendário" }, { href: "/tarefas", t: "Tarefas" }, { href: "/aplicacoes", t: "Aplicações", badge: novas }] },
    { nome: "Marketing", itens: [
      { href: "/estrategia", t: "Estratégia" }, { href: "/posicionamento", t: "Posicionamento" }, { href: "/editorial", t: "Linha editorial" },
    ] },
    { nome: "Gestão", itens: [{ href: "/crm", t: "CRM" }, { href: "/produtos", t: "Produtos" }, { href: "/financeiro", t: "Financeiro" }] },
  ];

  const ativo = (href: string) => (href === "/" ? atual === "/" : atual === href || atual.startsWith(href + "/"));

  return (
    <aside className="z-20 shrink-0 bg-ink text-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:flex-col md:overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 md:px-7 md:pb-6 md:pt-8">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-vivo">Studio - SM</span>
        <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} aria-controls="menu-principal"
          className="min-h-[44px] px-2 text-[13px] font-bold md:hidden">
          {aberto ? "Fechar" : "Menu"}
        </button>
      </div>

      <nav id="menu-principal" aria-label="Menu principal"
        className={`${aberto ? "flex" : "hidden"} flex-1 flex-col gap-0.5 border-t border-side-line px-3 pb-4 pt-2 md:flex md:border-0 md:px-4 md:pt-0`}>
        {grupos.map((g, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {g.nome && <span className="mt-4 px-3 pb-1.5 pt-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-side-label">{g.nome}</span>}
            {g.itens.map(({ href, t, badge }) => {
              const on = ativo(href);
              return (
                <Link key={href} href={href} aria-current={on ? "page" : undefined}
                  className={`flex min-h-[44px] items-center justify-between gap-2 py-2.5 pr-3 transition-colors md:min-h-0 ${g.nome ? "pl-6 text-[13px]" : "pl-3 text-sm"} ${
                    on ? "bg-red font-bold text-white" : "font-semibold text-side-text hover:bg-white/5 hover:text-white"}`}>
                  {t}
                  {!!badge && (
                    <span className={`min-w-[22px] px-1.5 py-0.5 text-center text-[11px] font-bold ${on ? "bg-white text-red" : "bg-red text-white"}`}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        <form action={sair} className="mt-auto flex items-center justify-between gap-3 border-t border-side-line px-3 pt-4 text-[13px]">
          <span className="text-side-text">{nome}</span>
          <button type="submit" className="min-h-[44px] font-bold text-white hover:text-red-vivo md:min-h-0">Sair</button>
        </form>
      </nav>
    </aside>
  );
}
