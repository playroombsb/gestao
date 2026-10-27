import type { Metadata } from "next";
import { Titillium_Web } from "next/font/google";
import { SITE_BAILE } from "@/lib/baile";

/** Prévia do link no WhatsApp, Instagram e afins (imagem em public/baile/og.jpg, 1200×630). */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_BAILE),
  openGraph: {
    type: "website", locale: "pt_BR", siteName: "Playroom BSB",
    title: "O Baile dos Condenados · Playroom",
    description: "Play Party do Playroom em Brasília: BDSM, fetiches e desejo em um só lugar. 18+. Aplicação aberta.",
    images: [{ url: `${SITE_BAILE}/baile/og.jpg`, width: 1200, height: 630, alt: "O Baile dos Condenados" }],
  },
  twitter: { card: "summary_large_image", images: [`${SITE_BAILE}/baile/og.jpg`] },
};

const titillium = Titillium_Web({ subsets: ["latin"], weight: ["300", "400", "600", "700"], display: "swap" });

/** Fonte e fundo do site da festa (baile.playroombsb.com.br): página inicial e formulário. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${titillium.className} flex min-h-screen min-w-0 flex-col bg-[#060607] text-white antialiased [&_a:not([class])]:text-[#ff2a44]`}>
      {/* Fundo escuro também no html e no body (vence a classe do sistema), para não aparecer faixa clara ao rolar no celular */}
      <style>{"html,body{background:#060607!important}"}</style>
      {children}
    </div>
  );
}
