import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Studio - SM",
  description: "Mix de produtos do Playroom: ticket, margem e giro viram lucro mensal e matriz de decisão.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="bg-bg text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
