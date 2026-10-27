import { INGRESSOS_BAILE, PROMO_ATE } from "@/lib/baile";

const PROMO_CURTA = PROMO_ATE.slice(8, 10) + "/" + PROMO_ATE.slice(5, 7);
const LARGURA_MASCARA = [34, 26, 20];

/**
  Cards "Escolha a sua sentença". Só mostram os valores: ninguém compra na hora, porque antes precisa aplicar
  (decisão da Ana em 27/10/2026). A seta abre o formulário em outra página (/aplicacao) com o ingresso marcado.
*/
const FUNDO = "bg-[linear-gradient(180deg,#101012,#060607)]";

export default function BaileIngressos({ encerrado, promo, topo, lateral }: {
  encerrado: boolean; promo: boolean;
  /** Título e texto da dobra de ingressos (vêm da página) */
  topo: React.ReactNode;
  /** Rótulo vertical da dobra de ingressos */
  lateral: React.ReactNode;
}) {
  return (
    <section id="ingressos" className={`relative scroll-mt-4 overflow-hidden px-5 pb-16 pt-14 md:px-[clamp(20px,5vw,60px)] md:py-20 ${FUNDO}`}>
      {/* Mão em chamas à direita (trocada com as mãos da segunda dobra, pedidos da Ana em 27/10/2026). No celular
          fica pequena atrás dos cards; no computador ocupa a altura toda da dobra e some pela esquerda e pelas pontas. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/baile/espera.webp" alt="" aria-hidden width={1034} height={1520}
        className="pointer-events-none absolute -bottom-10 -right-16 w-[min(80vw,320px)] select-none opacity-35 [mask-image:radial-gradient(ellipse_at_50%_60%,#000_10%,rgba(0,0,0,.55)_34%,transparent_62%)] md:inset-y-0 md:bottom-auto md:right-0 md:h-full md:w-auto md:max-w-[48vw] md:object-cover md:object-[50%_40%] md:opacity-90 md:[-webkit-mask-composite:source-in] md:[mask-composite:intersect] md:[mask-image:linear-gradient(90deg,transparent,#000_58%),linear-gradient(180deg,transparent,#000_10%,#000_82%,transparent)]" />
      {/* No computador o conteúdo vai um pouco para a esquerda, abrindo espaço para a mão */}
      <div className="relative mx-auto flex max-w-[930px] flex-col items-center gap-10 md:-translate-x-[clamp(30px,7vw,120px)]">
        {topo}
        <div className="flex w-full max-w-[460px] flex-col gap-[30px]">
          {INGRESSOS_BAILE.map((t, i) => {
            const w = LARGURA_MASCARA[i];
            return (
              <div key={t.n} className="flex flex-col border border-[#2a2a2d] bg-[#0d0d0e]">
                <div className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-[18px] p-3.5">
                  <div className="flex h-[76px] w-[76px] items-center justify-center gap-0.5 border border-[#2a2a2d] bg-black" aria-hidden>
                    {Array.from({ length: t.n }, (_, k) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={k} src="/baile/mascara-panico.png" alt="" width={w} height={Math.round((w * 262) / 170)} className="block" />
                    ))}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[16px]">{t.nome}</span>
                    <span className="text-[14px] font-semibold text-[#ff2a44]">R$ {promo ? t.promo : t.cheio}</span>
                    {promo && <span className="text-[13px] text-[#9a9ea6]">R$ {t.cheio} após {PROMO_CURTA}</span>}
                  </div>
                  {!encerrado && (
                    <a href={`/aplicacao?ingresso=${t.n}`} aria-label={`Aplicar com ingresso ${t.nome}`}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ff2a44] text-[16px] text-white transition-colors hover:bg-[#e0142f] hover:text-white">
                      →
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-2 border-t border-[#2a2a2d] text-center text-[14px]">
                  <span className="border-r border-[#2a2a2d] p-[7px] text-[#ff2a44]">{promo ? `Promo até ${PROMO_CURTA}` : "Lote atual"}</span>
                  <span className="p-[7px] text-[#8a8f99]">Pagamento após aprovação</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {lateral}
    </section>
  );
}
