import { lucro, quadrante, type Quadrante } from "@/lib/calc";
import type { Produto } from "@/lib/types";

const COR: Record<Quadrante, string> = {
  carro: "#c8102e",
  premium: "#7a0a18",
  caixa: "#0d0a0a",
  repensar: "#9a8f8d",
};

export default function Matriz({ itens, mm, mv }: { itens: Produto[]; mm: number; mv: number }) {
  if (itens.length < 2) {
    return (
      <div className="border-[1.5px] border-dashed border-line p-6 text-sm text-muted">
        A matriz aparece com pelo menos dois produtos preenchidos.
      </div>
    );
  }

  const W = 560, H = 400, L = 56, R = 24, T = 24, B = 48;
  const maxM = Math.max(100, ...itens.map((o) => o.margem!));
  const vs = itens.map((o) => Math.max(1, o.vendas!));
  const lo = Math.log10(Math.min(...vs) / 1.5);
  const hi = Math.log10(Math.max(...vs) * 1.5);
  const x = (v: number) => L + ((Math.log10(Math.max(1, v)) - lo) / (hi - lo || 1)) * (W - L - R);
  const y = (m: number) => T + (1 - m / maxM) * (H - T - B);
  const pmax = Math.max(1, ...itens.map((o) => Math.abs(lucro(o))));
  const raio = (o: Produto) => 6 + Math.sqrt(Math.abs(lucro(o)) / pmax) * 18;

  const ticks: number[] = [];
  for (let e = Math.floor(lo); e <= Math.ceil(hi); e++)
    for (const k of [1, 3]) {
      const v = k * 10 ** e;
      const lv = Math.log10(v);
      if (lv >= lo && lv <= hi) ticks.push(v);
    }

  const mx = x(Math.max(1, mv));
  const my = y(mm);
  const ordenados = [...itens].sort((a, b) => lucro(b) - lucro(a));

  return (
    <div className="overflow-x-auto border border-line bg-paper">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[340px]" role="img"
        aria-label="Matriz de margem por giro dos produtos" fontFamily="inherit" fontSize={11}>
        <rect x={mx} y={T} width={W - R - mx} height={my - T} fill="#fbe6e9" />
        {[0, 25, 50, 75, 100].filter((m) => m <= maxM).map((m) => (
          <g key={m}>
            <line x1={L} x2={W - R} y1={y(m)} y2={y(m)} stroke="#dcd3d1" />
            <text x={L - 8} y={y(m) + 4} textAnchor="end" fill="#5f5453">{m}%</text>
          </g>
        ))}
        {ticks.map((v) => (
          <text key={v} x={x(v)} y={H - B + 18} textAnchor="middle" fill="#5f5453">
            {v.toLocaleString("pt-BR")}
          </text>
        ))}
        <line x1={mx} x2={mx} y1={T} y2={H - B} stroke="#c8102e" strokeDasharray="4 4" />
        <line x1={L} x2={W - R} y1={my} y2={my} stroke="#c8102e" strokeDasharray="4 4" />
        <text x={W - R - 6} y={T + 15} textAnchor="end" fill="#c8102e" fontWeight={800} letterSpacing=".08em">CARRO-CHEFE</text>
        <text x={L + 6} y={T + 15} fill="#5f5453" fontWeight={700} letterSpacing=".08em">NICHO PREMIUM</text>
        <text x={W - R - 6} y={H - B - 8} textAnchor="end" fill="#5f5453" fontWeight={700} letterSpacing=".08em">GERADOR DE CAIXA</text>
        <text x={L + 6} y={H - B - 8} fill="#5f5453" fontWeight={700} letterSpacing=".08em">REPENSAR</text>
        <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle" fill="#5f5453">vendas por mês (escala log)</text>
        <text transform={`translate(14 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" fill="#5f5453">margem</text>
        {ordenados.map((o) => {
          const cx = x(Math.max(1, o.vendas!));
          const cy = y(Math.min(maxM, Math.max(0, o.margem!)));
          const r = raio(o);
          const dir = cx > W * 0.62;
          const nome = o.nome.length > 24 ? o.nome.slice(0, 23) + "…" : o.nome;
          return (
            <g key={o.id}>
              <circle cx={cx} cy={cy} r={r} fill={COR[quadrante(o, mm, mv)]} fillOpacity={0.9} stroke="#fff" strokeWidth={1.5} />
              <text x={dir ? cx - r - 5 : cx + r + 5} y={cy + 4} textAnchor={dir ? "end" : "start"}
                fill="#0d0a0a" fontWeight={600} fontSize={11.5}>{nome}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
