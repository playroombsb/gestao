"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "@/app/login/actions";

const LINKS = [
  { href: "/", t: "Números" },
  { href: "/painel", t: "Painel" },
  { href: "/estrategia", t: "Estratégia" },
  { href: "/tarefas", t: "Tarefas" },
];

export default function Nav({ nome }: { nome: string }) {
  const atual = usePathname();
  return (
    <nav aria-label="Principal" className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-[1080px] items-center overflow-x-auto px-2 md:px-3.5">
        {LINKS.map(({ href, t }) => {
          const ativo = atual === href;
          return (
            <Link key={href} href={href} aria-current={ativo ? "page" : undefined}
              className={`shrink-0 border-b-2 px-2.5 py-3.5 text-[13px] font-bold tracking-wide ${
                ativo ? "border-red text-ink" : "border-transparent text-muted hover:text-ink"}`}>
              {t}
            </Link>
          );
        })}
        <form action={sair} className="ml-auto flex shrink-0 items-center gap-3 pl-3">
          <span className="hidden text-[13px] text-muted sm:inline">{nome}</span>
          <button type="submit" className="px-2 py-3.5 text-[13px] font-bold text-muted hover:text-red">Sair</button>
        </form>
      </div>
    </nav>
  );
}
