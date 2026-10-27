"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { sair } from "@/app/login/actions";

type Item = { href: string; t: string; badge?: number };
type Icone = keyof typeof ICONES;
/** Entrada principal do menu: página solta (href) ou seção que abre e fecha com páginas dentro (itens). */
type Principal = { id: string; t: string; icone: Icone; href?: string; badge?: number; itens?: Item[] };

// Traços no estilo Lucide (licença ISC), 24x24
const ICONES = {
  inicio: ["M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8", "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  conversas: ["M7.9 20A9 9 0 1 0 4 16.1L2 22Z"],
  crm: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  calendario: ["M8 2v4", "M16 2v4", "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M3 10h18"],
  operacao: ["M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z", "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2", "m9 14 2 2 4-4"],
  marketing: ["m3 11 18-5v12L3 14v-3z", "M11.6 16.8a3 3 0 1 1-5.8-1.6"],
  gestao: ["M3 3v18h18", "M18 17V9", "M13 17V5", "M8 17v-3"],
  conhecimento: ["M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z", "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"],
  admin: ["M4 21v-7", "M4 10V3", "M12 21v-9", "M12 8V3", "M20 21v-5", "M20 12V3", "M2 14h4", "M10 8h4", "M18 16h4"],
};

function Ico({ nome }: { nome: Icone }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      {ICONES[nome].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

const Selo = ({ n, on }: { n: number; on?: boolean }) => (
  <span className={`ml-auto min-w-[22px] rounded-full px-1.5 py-0.5 text-center text-[12px] font-semibold ${on ? "bg-white text-red" : "bg-red text-white"}`}>{n}</span>
);

const GUARDA = "menu-secoes-abertas";

export default function Nav({ nome, novas, conversas, admin }: { nome: string; novas: number; conversas: number; admin: boolean }) {
  const atual = usePathname();
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [atual]);

  const menu: Principal[] = [
    { id: "inicio", t: "Início", icone: "inicio", href: "/" },
    ...(admin ? [{ id: "conversas", t: "Conversas", icone: "conversas" as const, href: "/conversas", badge: conversas }] : []),
    { id: "calendario", t: "Calendário", icone: "calendario", href: "/calendario" },
    { id: "crm", t: "CRM", icone: "crm", itens: [{ href: "/crm", t: "Pipeline" }, { href: "/crm/contatos", t: "Contatos" }] },
    { id: "operacao", t: "Operação", icone: "operacao", itens: [
      { href: "/tarefas", t: "Tarefas" }, { href: "/aplicacoes", t: "Aplicações", badge: novas },
    ] },
    { id: "marketing", t: "Marketing", icone: "marketing", itens: [
      { href: "/estrategia", t: "Estratégia" }, { href: "/posicionamento", t: "Posicionamento" },
      { href: "/editorial", t: "Linha editorial" }, { href: "/metricas", t: "Métricas" },
    ] },
    { id: "gestao", t: "Gestão", icone: "gestao", itens: [{ href: "/produtos", t: "Produtos" }, { href: "/financeiro", t: "Financeiro" }] },
    // Fora do Admin: todas as usuárias veem os materiais (decisão da Ana em 22/10/2026)
    { id: "conhecimento", t: "Conhecimento", icone: "conhecimento", itens: [{ href: "/materiais", t: "Materiais de apoio" }] },
    ...(admin ? [{ id: "admin", t: "Admin", icone: "admin" as const, itens: [{ href: "/admin/usuarios", t: "Usuários" }, { href: "/admin/integracoes", t: "Integrações" }] }] : []),
  ];

  // Página ativa: a entrada mais específica ganha (em /crm/contatos, "Contatos" acende e "Pipeline" não)
  const todos = menu.flatMap((p) => [p.href, ...(p.itens ?? []).map((i) => i.href)]).filter((h): h is string => !!h);
  const casa = (href: string) => (href === "/" ? atual === "/" : atual === href || atual.startsWith(href + "/"));
  const ativo = (href: string) => casa(href) && !todos.some((h) => h !== href && h.startsWith(href + "/") && casa(h));
  const dentro = (p: Principal) => !!p.itens?.some((i) => ativo(i.href));

  // Seções abertas: lembradas neste navegador; a seção da página atual sempre abre ao chegar nela
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const secaoAtual = menu.find(dentro)?.id;
  useEffect(() => {
    let guardadas: Record<string, boolean> = {};
    try { guardadas = JSON.parse(localStorage.getItem(GUARDA) ?? "{}"); } catch { /* sem armazenamento: só a seção atual abre */ }
    setAbertas(secaoAtual ? { ...guardadas, [secaoAtual]: true } : guardadas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (secaoAtual) setAbertas((a) => (a[secaoAtual] ? a : { ...a, [secaoAtual]: true }));
  }, [secaoAtual]);
  function alternar(id: string, agora: boolean) {
    setAbertas((a) => {
      const n = { ...a, [id]: !agora };
      try { localStorage.setItem(GUARDA, JSON.stringify(n)); } catch { /* ignora */ }
      return n;
    });
  }

  const principal = "flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-[15px] font-semibold transition-colors";

  return (
    <aside className="z-20 shrink-0 print:hidden bg-ink bg-[linear-gradient(165deg,#2b1216_0%,#150c0d_35%,#0d0a0a_70%)] pt-[env(safe-area-inset-top)] text-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:overflow-y-auto md:pt-0">
      <div className="flex items-center justify-between px-4 py-3 md:px-7 md:pb-6 md:pt-8">
        <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-red-vivo">Playroom</span>
        <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} aria-controls="menu-principal"
          className="min-h-[44px] rounded-lg px-3 text-[14px] font-semibold hover:bg-white/10 md:hidden">
          {aberto ? "Fechar" : "Menu"}
        </button>
      </div>

      <nav id="menu-principal" aria-label="Menu principal"
        className={`${aberto ? "flex" : "hidden"} flex-1 flex-col gap-1 border-t border-side-line px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 md:flex md:border-0 md:px-4 md:pt-0`}>
        {menu.map((p) => {
          if (p.href) {
            const on = ativo(p.href);
            return (
              <Link key={p.id} href={p.href} aria-current={on ? "page" : undefined}
                className={`${principal} ${on ? "bg-red text-white" : "text-white/90 hover:bg-white/[0.06] hover:text-white"}`}>
                <Ico nome={p.icone} />
                {p.t}
                {!!p.badge && <Selo n={p.badge} on={on} />}
              </Link>
            );
          }
          const temAtivo = dentro(p);
          // Antes de ler o navegador, a seção da página atual já vem aberta (sem piscar)
          const exp = abertas[p.id] ?? temAtivo;
          const soma = (p.itens ?? []).reduce((s, i) => s + (i.badge ?? 0), 0);
          return (
            <div key={p.id} className="flex flex-col">
              <button type="button" aria-expanded={exp} aria-controls={`secao-${p.id}`} onClick={() => alternar(p.id, exp)}
                className={`${principal} text-left ${temAtivo ? "text-white" : "text-white/90 hover:text-white"} hover:bg-white/[0.06]`}>
                <span className={temAtivo ? "text-red-vivo" : ""}><Ico nome={p.icone} /></span>
                {p.t}
                {!exp && soma > 0 && <Selo n={soma} />}
                <svg aria-hidden viewBox="0 0 12 12" className={`${!exp && soma > 0 ? "" : "ml-auto"} h-3 w-3 shrink-0 text-side-label transition-transform duration-200 ${exp ? "rotate-180" : ""}`}>
                  <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <ul id={`secao-${p.id}`} className={`${exp ? "flex" : "hidden"} ml-[21px] flex-col gap-0.5 border-l border-side-line py-1 pl-3`}>
                {p.itens!.map(({ href, t, badge }) => {
                  const on = ativo(href);
                  return (
                    <li key={href}>
                      <Link href={href} aria-current={on ? "page" : undefined}
                        className={`flex min-h-[38px] items-center gap-2 rounded-lg px-3 text-[14px] transition-colors toque:min-h-[44px] ${
                          on ? "bg-red font-semibold text-white" : "font-medium text-side-text hover:bg-white/5 hover:text-white"}`}>
                        {t}
                        {!!badge && <Selo n={badge} on={on} />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        <form action={sair} className="mt-auto flex items-center justify-between gap-2 border-t border-side-line pt-3 text-[14px]">
          <Link href="/conta" aria-current={atual === "/conta" ? "page" : undefined}
            className={`flex min-h-[40px] min-w-0 flex-1 items-center truncate rounded-lg px-3 hover:bg-white/5 hover:text-white toque:min-h-[44px] ${atual === "/conta" ? "bg-white/10 font-semibold text-white" : "text-side-text"}`}>
            {nome}
          </Link>
          <button type="submit" className="min-h-[40px] rounded-lg px-3 font-semibold text-white hover:bg-white/10 hover:text-red-vivo toque:min-h-[44px]">Sair</button>
        </form>
      </nav>
    </aside>
  );
}
