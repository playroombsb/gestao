import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { sessao } from "@/lib/auth";
import { db } from "@/lib/supabase";
import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Playroom",
  description: "Gestão do Playroom: tarefas, aplicações, marketing, CRM, produtos e financeiro.",
  robots: { index: false, follow: false },
};

// viewport-fit=cover: o menu respeita a área do entalhe e da barra do iPhone (safe-area)
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0d0a0a" };

/** Aplicações ainda não lidas, para o número no menu. Falha aqui não derruba a página. */
async function contarNovas() {
  const { count } = await db().from("aplicacoes").select("id", { count: "exact", head: true }).eq("status", "nova");
  return count ?? 0;
}

/** Conversas do WhatsApp com mensagem não lida (o número só aparece para admin). */
async function contarConversas() {
  const { count } = await db().from("wa_conversas").select("jid", { count: "exact", head: true }).gt("nao_lidas", 0);
  return count ?? 0;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // As consultas em paralelo: as contagens são descartadas se não houver sessão
  const [s, novas, conversas] = await Promise.all([sessao(), contarNovas().catch(() => 0), contarConversas().catch(() => 0)]);
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="bg-bg font-sans text-ink antialiased">
        {s ? (
          <div className="md:flex">
            <Nav nome={s.nome} novas={novas} conversas={s.admin ? conversas : 0} admin={s.admin} />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        ) : children}
      </body>
    </html>
  );
}
