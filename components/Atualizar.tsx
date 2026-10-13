"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Recarrega os dados do painel a cada 30 s e no toque do botão. */
export default function Atualizar() {
  const router = useRouter();
  const [carregando, iniciar] = useTransition();
  const [hora, setHora] = useState<string | null>(null);

  useEffect(() => {
    const marcar = () => setHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    marcar();
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      iniciar(() => router.refresh());
      marcar();
    }, 30000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <button type="button"
      onClick={() => {
        iniciar(() => router.refresh());
        setHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      }}
      className="min-h-[44px] border-2 border-ink px-4 text-[13px] font-bold tracking-wide hover:bg-ink hover:text-white md:min-h-0 md:py-[9px]">
      {carregando ? "Atualizando…" : hora ? `Atualizar · conferido às ${hora}` : "Atualizar"}
    </button>
  );
}
