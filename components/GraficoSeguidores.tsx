"use client";

import { useEffect, useRef, useState } from "react";

const A = 200; // altura do desenho; a largura acompanha a tela para o texto não encolher no celular
const M = { topo: 16, dir: 16, base: 28, esq: 64 };
const FUSO = "America/Sao_Paulo";
const dia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" });
const mil = (n: number) => n.toLocaleString("pt-BR");

/** Seguidores ao longo das coletas. Uma série só: o título nomeia, sem legenda. Passar o mouse mostra o valor do ponto. */
export default function GraficoSeguidores({ serie }: { serie: { em: string; n: number }[] }) {
  const [foco, setFoco] = useState<number | null>(null);
  const [L, setL] = useState(640);
  const svg = useRef<SVGSVGElement>(null);
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setL(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (serie.length < 2) {
    return (
      <p className="rounded-xl border-[1.5px] border-dashed border-line p-5 text-[13px] text-muted">
        {serie.length === 1 ? `Uma coleta até agora (${mil(serie[0].n)} seguidores). A linha aparece a partir da segunda.` : "Ainda sem coletas do Instagram."}
      </p>
    );
  }

  const t0 = Date.parse(serie[0].em), t1 = Date.parse(serie[serie.length - 1].em);
  const min = Math.min(...serie.map((p) => p.n)), max = Math.max(...serie.map((p) => p.n));
  const folga = Math.max(1, Math.round((max - min) * 0.15));
  const y0 = Math.max(0, min - folga), y1 = max + folga;
  const x = (iso: string) => M.esq + ((Date.parse(iso) - t0) / Math.max(1, t1 - t0)) * (L - M.esq - M.dir);
  const y = (n: number) => M.topo + (1 - (n - y0) / Math.max(1, y1 - y0)) * (A - M.topo - M.base);
  const pontos = serie.map((p) => `${x(p.em).toFixed(1)},${y(p.n).toFixed(1)}`).join(" ");
  const marcas = [y0, Math.round((y0 + y1) / 2), y1];

  function mover(e: React.PointerEvent) {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * L;
    let melhor = 0;
    serie.forEach((p, i) => { if (Math.abs(x(p.em) - px) < Math.abs(x(serie[melhor].em) - px)) melhor = i; });
    setFoco(melhor);
  }

  const f = foco != null ? serie[foco] : null;

  return (
    <div ref={caixa} className="relative">
      <svg ref={svg} viewBox={`0 0 ${L} ${A}`} width={L} height={A} className="block max-w-full touch-none" role="img"
        aria-label={`Seguidores de ${mil(serie[0].n)} em ${dia(serie[0].em)} a ${mil(serie[serie.length - 1].n)} em ${dia(serie[serie.length - 1].em)}`}
        onPointerMove={mover} onPointerDown={mover} onPointerLeave={() => setFoco(null)}>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={M.esq} x2={L - M.dir} y1={y(m)} y2={y(m)} stroke="#e4dcda" strokeWidth="1" />
            <text x={M.esq - 8} y={y(m) + 4} textAnchor="end" className="fill-muted text-[11px]">{mil(m)}</text>
          </g>
        ))}
        <text x={M.esq} y={A - 8} className="fill-muted text-[11px]">{dia(serie[0].em)}</text>
        <text x={L - M.dir} y={A - 8} textAnchor="end" className="fill-muted text-[11px]">{dia(serie[serie.length - 1].em)}</text>
        <polyline points={pontos} fill="none" stroke="#c8102e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {f && (
          <g>
            <line x1={x(f.em)} x2={x(f.em)} y1={M.topo} y2={A - M.base} stroke="#0d0a0a" strokeOpacity="0.25" strokeWidth="1" />
            <circle cx={x(f.em)} cy={y(f.n)} r="5" fill="#c8102e" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {f && (
        <div role="status" className="pointer-events-none absolute top-0 rounded-lg bg-ink px-2.5 py-1.5 text-[12px] text-white shadow-lg"
          style={{ left: `${(x(f.em) / L) * 100}%`, transform: `translateX(${x(f.em) > L * 0.7 ? "-105%" : "8px"})` }}>
          <strong className="tabular-nums">{mil(f.n)}</strong> seguidores · {dia(f.em)}
        </div>
      )}
    </div>
  );
}
