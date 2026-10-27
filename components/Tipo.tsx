import { COR_AGENDA } from "@/lib/agenda";

/** Selo do tipo de contato (sessão, aluguel ou evento), nas mesmas cores do calendário. */
export default function Tipo({ tipo }: { tipo: "sessao" | "aluguel" | "evento" }) {
  return <span className={`selo ${COR_AGENDA[tipo].cor}`}>{COR_AGENDA[tipo].um}</span>;
}
