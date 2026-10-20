import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { sessao } from "@/lib/auth";
import { db } from "@/lib/supabase";
import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Studio - SM",
  description: "Gestão do Playroom: tarefas, aplicações, marketing, CRM, produtos e financeiro.",
  robots: { index: false, follow: false },
};

/** Aplicações ainda não lidas, para o número no menu. Falha aqui não derruba a página. */
async function contarNovas() {
  const { count } = await db().from("aplicacoes").select("id", { count: "exact", head: true }).eq("status", "nova");
  return count ?? 0;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = sessao();
  const novas = s ? await contarNovas().catch(() => 0) : 0;
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="bg-bg font-sans text-ink antialiased">
        {s ? (
          <div className="md:flex">
            <Nav nome={s.nome} novas={novas} />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        ) : children}
      </body>
    </html>
  );
}
