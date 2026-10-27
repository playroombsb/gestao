import type { Metadata } from "next";
import BaileIngressos from "@/components/BaileIngressos";
import { emPromo, PROMO_ATE } from "@/lib/baile";
import { proximoEvento } from "@/lib/evento-publico";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "O Baile dos Condenados · Playroom",
  description: "Play Party do Playroom em Brasília: BDSM, fetiches e desejo em um só lugar. 18+.",
};

/*
  Site público da festa: baile.playroombsb.com.br (o middleware manda esse domínio para cá).
  Design: handoff "O Baile dos Condenados" (Ana, 27/10/2026). Mostra a próxima festa do calendário;
  o formulário fica em outra página (/aplicacao, decisão da Ana em 27/10/2026) e cai no CRM, no pipeline do evento, fila Aplicação.
  Fotos e artes em public/baile/, listadas em FOTOS.
*/
const FOTOS: Record<"hero" | "espera" | "sandra", string | null> = { hero: "/baile/hero.webp", espera: "/baile/maos.png", sandra: "/baile/mistress-sandra-rosto.webp" };

const PADDING_ESQ = "pl-[60px] md:pl-[clamp(60px,15vw,185px)]";
const PADDING_DIR = "pr-5 md:pr-[clamp(20px,3vw,38px)]";
const FUNDO = "bg-[linear-gradient(180deg,#101012,#060607)]";
const BOTAO = "inline-block w-max rounded-full bg-[#ff2a44] px-6 py-[9px] text-[15px] font-semibold text-white transition-colors hover:bg-[#e0142f] hover:text-white";

/** Rótulo vertical no canto da seção, com a linha vermelha. */
function Lateral({ texto, direita, escuro = true, sempre }: { texto: string; direita?: boolean; escuro?: boolean; sempre?: boolean }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute bottom-7 flex-col items-center gap-3 ${sempre ? "flex" : "hidden md:flex"} ${
      direita ? "right-[clamp(20px,3vw,30px)]" : "left-[clamp(20px,3vw,30px)]"}`}>
      <span className={`rotate-180 text-[13px] [writing-mode:vertical-rl] ${escuro ? "text-white" : "text-[#111]"}`}>{texto}</span>
      <span className="h-[70px] w-[1.5px] bg-[#ff2a44]" />
    </div>
  );
}

/**
  Arte de fundo de um lado da seção. A própria imagem esmaece (máscara), sem cor por cima, para fundir no
  degradê do fundo. No celular fica atrás do texto, mais apagada e sumindo para baixo; no computador ocupa
  um lado e some na direção do texto e para baixo. `foco` = object-position (o que não pode ser cortado).
*/
function Arte({ src, lado, foco, focoMd }: { src: string | null; lado: "esq" | "dir"; foco: string; focoMd: string }) {
  if (!src) return null;
  const mascaraMd = lado === "dir"
    ? "md:[mask-image:linear-gradient(90deg,transparent,#000_48%),linear-gradient(0deg,transparent,#000_32%)]"
    : "md:[mask-image:linear-gradient(270deg,transparent,#000_48%),linear-gradient(180deg,transparent,#000_22%,#000_68%,transparent)]";
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 md:w-[58%] ${lado === "dir" ? "md:left-auto" : "md:right-auto"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className={`h-full w-full object-cover opacity-50 [mask-image:linear-gradient(180deg,#000_30%,transparent_80%)] md:opacity-100 md:[-webkit-mask-composite:source-in] md:[mask-composite:intersect] ${foco} ${focoMd} ${mascaraMd}`} />
    </div>
  );
}

const ESPERA = [
  "Espaço liberado para práticas",
  "Muita música, performances e dinâmicas",
  "Open cooler",
  "Piscina aquecida",
  "Endereço sigiloso, enviado na véspera",
];

const REGRAS: [string, string][] = [
  ["Vista-se como ficar confortável", "A vestimenta fetichista é uma sugestão. A nudez é permitida, porém cuidado com o frio. Boa parte do terreno é gramado, então saltos altos podem ser desconfortáveis."],
  ["Piscina aquecida", "Pode tomar banho pelade, mas não pode ter relações na água. Use a sauna ou as árvores."],
  ["Cenas com consentimento", "Cenas fetichistas e sexuais são permitidas, sempre com consentimento de todas as pessoas participantes. Se uma cena consensual te incomodar, apenas se retire do ambiente. O seu fetiche pode não ser o meu fetiche, e tá tudo bem."],
  ["Performances explicadas", "Antes das performances oficiais, haverá uma breve explicação sobre as práticas."],
  ["Não é NÃO. Apenas SIM é SIM.", "Negociação é essencial e consentimento é lei. Pergunte antes de interagir ou tocar em qualquer pessoa. Etiquetas vão sinalizar se a pessoa quer ser chamada pra jogar, só conversar ou ficar na dela. Se for recusade, não insista: receba um não com a mesma elegância que um sim."],
  ["Respeite a coleira", "A coleira pode simbolizar que a pessoa pertence a alguém como sub. Não toque na coleira, converse antes de propor qualquer prática e respeite a hierarquia existente, quando houver."],
  ["Corpos, gêneros e pronomes", "Respeite o corpo, o gênero e os pronomes das pessoas. Se alguém te incomodar ou você presenciar assédio, não se cale: procure a equipe. Mistress Sandra, Sol e Rita estão preparades para auxiliar e acolher sem te expor."],
  ["Sem exageros", "Evite exagerar no álcool e em substâncias, principalmente se tiver intenção de jogar. Não jogue em estado alterado de consciência."],
];
const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

function quandoCurto(iso: string) {
  const d = new Date(iso);
  const p = Object.fromEntries(new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return { dia: p.day, mes: String(p.month).replace(".", "").toUpperCase(), hora: `${p.hour}:${p.minute}`, horaCurta: `${Number(p.hour)}h` };
}

export default async function Page() {
  const ev = await proximoEvento();
  const promo = emPromo();
  const q = ev ? quandoCurto(ev.inicio) : null;
  const promoLonga = new Date(`${PROMO_ATE}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "UTC" });
  const promoCurta = `${PROMO_ATE.slice(8, 10)}/${PROMO_ATE.slice(5, 7)}`;

  return (
    <>

      {/* 1. Hero */}
      <section className={`relative flex min-h-[600px] flex-col overflow-hidden md:min-h-[640px] ${FUNDO}`}>
        {/* Arte espelhada para ela olhar para o texto; presa no topo para não cortar a cabeça */}
        <Arte src={FOTOS.hero} lado="dir" foco="object-top" focoMd="md:object-top" />
        <header className="relative flex items-center justify-between gap-4 px-5 py-7 md:px-[clamp(20px,3vw,38px)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/baile/logo-branco.png" alt="Playroom" className="block h-16 w-auto" />
        </header>
        <div className={`relative flex max-w-[760px] flex-1 flex-col justify-center gap-[26px] pb-14 pt-6 md:box-content md:pb-16 md:pt-8 ${PADDING_ESQ} ${PADDING_DIR}`}>
          <p className="m-0 text-[13px] font-semibold tracking-[.14em] text-[#ff2a44] md:text-[15px] md:tracking-[.2em]">
            PLAY PARTY{q ? ` · ${q.dia} ${q.mes} · ${q.hora}` : ""} · 18+
          </p>
          <h1 className="m-0 text-[clamp(52px,7vw,84px)] font-semibold leading-none tracking-[-.01em]">O Baile dos Condenados.</h1>
          <p className="m-0 max-w-[400px] text-[17px] font-semibold leading-[1.6]">
            Uma festa dançante com performances e dinâmicas de integração: BDSM, fetiches e desejo em um só lugar.
          </p>
          <a href="/aplicacao" className="group flex max-w-full items-center gap-4 text-white transition-colors hover:text-[#ff2a44]">
            <span className="relative flex h-[68px] w-[68px] flex-none items-center justify-center rounded-full bg-[#ff2a44] shadow-[0_0_0_5px_#0a0a0b,0_0_0_6px_#ff2a44]">
              <svg viewBox="0 0 40 40" width="30" height="30" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M8,20 H31 M23,12 L31,20 L23,28" />
              </svg>
              <svg viewBox="0 0 68 60" width="68" height="60" aria-hidden className="absolute left-0 top-[44px] overflow-visible">
                <path fill="#ff2a44" d="M14,10 C18,14 20,16 21,22 C21.6,26 21,32 21.5,36 C22,40 25,40 25.4,36 C26,30 25,22 27,17 C28,15 30,13 32,12 C34,16 35,20 35.5,26 C36,34 35.8,44 36.5,50 C37,55 41,55 41.4,50 C42,42 40.5,30 42,22 C43,17 46,14 50,11 C51,13 51.4,16 51.6,20 C52,24 55,24 55.2,20 C55.4,16 55,13 54,10 Z" />
                <ellipse cx="38.9" cy="58" rx="2.4" ry="3.2" fill="#ff2a44" />
              </svg>
            </span>
            <span className="text-[15px]">Preencha o formulário de participação</span>
          </a>
        </div>
        <Lateral texto={`A sentença é às ${q?.horaCurta ?? "19h"}`} sempre />
      </section>

      {/* 2. O que te espera */}
      {/* Mãos e texto lado a lado, o conjunto centralizado (pedido da Ana em 27/10/2026); no celular as mãos ficam atrás do texto */}
      <section className={`relative flex flex-col overflow-hidden md:min-h-[600px] md:flex-row md:items-stretch md:justify-center md:gap-[clamp(28px,4vw,64px)] md:px-[clamp(40px,5vw,80px)] ${FUNDO}`}>
        {FOTOS.espera && (
          <div aria-hidden className="pointer-events-none absolute -bottom-10 -left-16 w-[min(95vw,420px)] opacity-30 md:relative md:bottom-auto md:left-auto md:flex md:w-auto md:flex-none md:items-end md:opacity-85">
            {/* No computador as mãos sobem da base até perto do topo da dobra */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FOTOS.espera} alt="" width={736} height={736}
              className="block w-full select-none [mask-image:linear-gradient(to_top,#000_55%,transparent)] md:h-[86%] md:w-auto md:max-w-[50vw] md:-mb-6 md:object-contain md:object-bottom md:[mask-image:linear-gradient(to_top,#000_82%,transparent)]" />
          </div>
        )}
        <div className="relative flex max-w-[420px] flex-col justify-center gap-[22px] pb-16 pl-[60px] pr-5 pt-14 md:px-0 md:py-20">
          <h2 className="m-0 text-[46px] font-normal leading-[1.05]">O que te espera</h2>
          <p className="m-0 text-[17px] font-light leading-[1.65] text-[#9a9ea6]">
            Um ambiente seguro, inclusivo e acolhedor, onde todas as pessoas são bem-vindas. Local no Lago Norte.
          </p>
          <ol className="mt-2.5 flex list-none flex-col gap-4 p-0">
            {ESPERA.map((t, i) => (
              <li key={t} className="flex items-center gap-5 text-[16px]">
                <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full border-[1.5px] border-[#333] text-[13px] font-bold text-[#ff2a44]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {t}
              </li>
            ))}
          </ol>
          <a href="#ingressos" className={`mt-3.5 ${BOTAO}`}>Quero participar</a>
        </div>
        <Lateral texto="Condenados ao prazer" sempre />
      </section>

      {/* 3. Ingressos (só demonstrativos; a seta abre o formulário em /aplicacao) */}
      {ev ? (
        <BaileIngressos encerrado={ev.encerrado} promo={promo}
          lateral={<Lateral texto={promo ? `Promo até ${promoCurta}` : "Escolha a sua sentença"} />}
          topo={
            <div className="flex flex-col items-center gap-5 text-center">
              <h2 className="m-0 text-[clamp(38px,5vw,46px)] font-normal leading-[1.05]">Escolha a sua sentença</h2>
              <p className="m-0 max-w-[440px] text-[17px] font-light leading-[1.65] text-[#9a9ea6]">
                {promo
                  ? <>Valor promocional até <b className="font-semibold text-white">{promoLonga}</b>. Para participar, preencha o formulário e aguarde o retorno da Mistress Sandra.</>
                  : <>Para participar, preencha o formulário e aguarde o retorno da Mistress Sandra.</>}
              </p>
            </div>
          } />
      ) : (
        <section id="ingressos" className={`px-5 py-[110px] text-center ${FUNDO}`}>
          <p className="text-[17px] text-[#9a9ea6]">A próxima festa ainda não tem data.</p>
        </section>
      )}

      {/* 4. Regras da casa */}
      <section className="relative overflow-hidden bg-white px-5 pb-16 pt-14 text-[#111] md:py-20 md:px-[clamp(20px,5vw,60px)]">
        <div className="relative z-[1] mx-auto flex max-w-[960px] flex-col items-center gap-10">
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <h2 className="m-0 text-[clamp(38px,5vw,46px)] font-normal leading-[1.05]">Regras da casa</h2>
              <p className="m-0 max-w-[680px] text-[17px] font-bold leading-[1.65] text-[#2e3035]">
                Regras de conduta importantes para pessoas novatas e veteranas nesse tipo de evento.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3.5">
              <div className="flex items-center gap-3.5 text-[12px] font-bold tracking-[.24em] text-[#ff2a44]">
                <span className="h-[1.5px] w-10 bg-[#ff2a44]" />CONSENTIMENTO É LEI<span className="h-[1.5px] w-10 bg-[#ff2a44]" />
              </div>
              <p className="m-0 flex flex-wrap items-baseline justify-center gap-x-[22px] gap-y-1 leading-none">
                <span className="text-[clamp(40px,6vw,64px)] font-bold tracking-[-.01em]">Não é <span className="text-[#ff2a44]">NÃO.</span></span>
                <span className="text-[clamp(40px,6vw,64px)] font-light tracking-[-.01em]">Só <b className="font-bold">SIM</b> é SIM.</span>
              </p>
            </div>
          </div>
          <ol className="m-0 grid w-full list-none grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-x-14 p-0 text-left">
            {REGRAS.map(([titulo, texto], i) => (
              <li key={titulo} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3.5 border-t border-[#e6e6e6] py-[22px]">
                <span className="text-[20px] font-bold text-[#ff2a44]">{ROMANOS[i]}</span>
                <div className="flex flex-col gap-1.5">
                  <b className="text-[17px] font-semibold">{titulo}</b>
                  <span className="text-[15px] leading-[1.55] text-[#2e3035]">{texto}</span>
                </div>
              </li>
            ))}
          </ol>
          <a href="/aplicacao" className={BOTAO}>Quero participar</a>
        </div>
        <Lateral texto="São, seguro e consensual" direita escuro={false} />
      </section>

      {/* 5. Organizado por */}
      {/* Foto da Mistress Sandra em círculo à esquerda do texto, colorida e do ombro para cima; o conjunto fica
          centralizado na página (pedidos da Ana em 27/10/2026) */}
      <section className={`relative flex flex-col items-center justify-center gap-10 overflow-hidden border-t border-[#1a1a1a] px-5 pb-16 pt-14 text-center md:flex-row md:gap-[clamp(40px,6vw,90px)] md:px-[clamp(60px,8vw,120px)] md:py-20 md:text-left ${FUNDO}`}>
        {FOTOS.sandra && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={FOTOS.sandra} alt="Mistress Sandra" width={560} height={560}
            className="block h-[220px] w-[220px] flex-none rounded-full object-cover shadow-[0_0_0_6px_#0a0a0b,0_0_0_7.5px_#ff2a44] md:h-[clamp(240px,26vw,320px)] md:w-[clamp(240px,26vw,320px)]" />
        )}
        <div className="relative flex max-w-[440px] flex-col items-center gap-[22px] md:items-start">
          <p className="m-0 text-[13px] font-semibold tracking-[.2em] text-[#ff2a44]">ORGANIZADO POR</p>
          <h2 className="m-0 text-[46px] font-normal leading-[1.05]">Mistress Sandra</h2>
          <p className="m-0 text-[17px] font-light leading-[1.65] text-[#9a9ea6]">
            Dominadora profissional e fundadora do Playroom BSB, em Brasília. Conduz sessões, workshops de BDSM e encontros da comunidade, sempre com foco em consentimento, segurança e acolhimento.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[15px] md:justify-start">
            <span className="flex items-center gap-3"><span className="h-[1.5px] w-7 bg-[#ff2a44]" />Playroom BSB</span>
            <a href="https://www.instagram.com/playroombsb/" target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 text-white transition-colors hover:text-[#ff2a44]">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              @playroombsb
            </a>
          </div>
        </div>
        {/* Logo do Playroom como marca-d'água no canto inferior direito da página (pedido da Ana em 27/10/2026) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/baile/logo-branco.png" alt="" aria-hidden width={1080} height={1080}
          className="pointer-events-none absolute -bottom-12 -right-12 w-[260px] select-none opacity-[.07] md:-bottom-16 md:-right-16 md:w-[clamp(320px,34vw,500px)]" />
        <Lateral texto="Sua anfitriã" />
      </section>
    </>
  );
}
