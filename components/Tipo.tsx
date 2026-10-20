import { COR_AGENDA } from "@/lib/agenda";

/** Selo do tipo de atendimento (sessão ou aluguel), nas mesmas cores do calendário. */
export default function Tipo({ tipo }: { tipo: "sessao" | "aluguel" }) {
  return <span className={`selo ${COR_AGENDA[tipo].cor}`}>{COR_AGENDA[tipo].um}</span>;
}
