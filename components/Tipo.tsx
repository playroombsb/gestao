/** Selo do tipo de atendimento: sessão em preto, aluguel em rosado. */
export default function Tipo({ tipo }: { tipo: "sessao" | "aluguel" }) {
  return tipo === "aluguel"
    ? <span className="shrink-0 bg-red-soft px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-red-deep">Aluguel</span>
    : <span className="shrink-0 bg-ink px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white">Sessão</span>;
}
