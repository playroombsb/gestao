import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { sessao } from "@/lib/auth";
import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Studio - SM",
  description: "Estratégia do Playroom: números dos produtos, posicionamento e tarefas do projeto.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const s = sessao();
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="bg-bg text-ink font-sans antialiased">
        {s && <Nav nome={s.nome} />}
        {children}
      </body>
    </html>
  );
}
