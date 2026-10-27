"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { aplicar } from "@/app/evento/actions";
import { COMO_SOUBE, PERGUNTAS, type EstadoAplicacao } from "@/lib/aplicacao-evento";
import { INGRESSOS } from "@/lib/types";

/** Classes do tema: claro (sistema) ou escuro (site da festa, baile.playroombsb.com.br). */
const TEMA = {
  claro: {
    campo: "caixa", area: "caixa min-h-[88px] resize-y py-2.5", dica: "text-muted", ast: "text-red", erro: "text-red",
    pilulas: "flex flex-wrap gap-2", pilula: "pilula cursor-pointer", pilulaOn: "!border-ink !bg-ink !text-white",
    enviar: "btn-1 w-full sm:w-auto sm:self-start sm:px-8", acento: "accent-[#c8102e]",
    ok: "cartao flex flex-col gap-2", okTitulo: "titulo-secao", okTexto: "text-[15px] text-muted",
  },
  escuro: {
    campo: "min-h-[46px] w-full min-w-0 border border-[#2a2a2d] bg-[#0d0d0e] px-3.5 text-base text-white outline-none placeholder:text-[#5c6068] focus:border-[#ff2a44]",
    area: "min-h-[96px] w-full min-w-0 resize-y border border-[#2a2a2d] bg-[#0d0d0e] px-3.5 py-2.5 text-base text-white outline-none focus:border-[#ff2a44]",
    dica: "text-[#9a9ea6]", ast: "text-[#ff2a44]", erro: "text-[#ff2a44]",
    pilulas: "grid grid-cols-3 gap-2 sm:flex sm:flex-wrap",
    pilula: "inline-flex min-h-[48px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[#333] px-3 text-[15px] text-white transition-colors hover:border-[#ff2a44] sm:px-5",
    pilulaOn: "!border-[#ff2a44] !bg-[#ff2a44] font-semibold",
    enviar: "w-full rounded-full bg-[#ff2a44] px-8 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#e0142f] disabled:opacity-60 sm:w-auto sm:self-start",
    acento: "accent-[#ff2a44]",
    ok: "flex flex-col gap-2 border border-[#2a2a2d] bg-[#0d0d0e] p-6", okTitulo: "text-[24px] font-normal", okTexto: "text-[15px] text-[#9a9ea6]",
  },
};
type Tema = (typeof TEMA)["claro"];

function Enviar({ t }: { t: Tema }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={t.enviar}>
      {pending ? "Enviando…" : "Enviar aplicação"}
    </button>
  );
}

function Pergunta({ titulo, obrigatoria, children, dica, t }: {
  titulo: string; obrigatoria?: boolean; children: React.ReactNode; dica?: string; t: Tema;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[15px] font-medium leading-snug">
        {titulo}{obrigatoria && <span className={t.ast} aria-hidden> *</span>}
      </span>
      {dica && <span className={`text-[13px] ${t.dica}`}>{dica}</span>}
      {children}
    </label>
  );
}

const inicial: EstadoAplicacao = { ok: false, erro: null };

export default function AplicacaoEvento({ eventoId, escuro, ingressoInicial }: {
  eventoId: string;
  escuro?: boolean;
  /** Ingresso já marcado (a seta do card no site da festa abre /aplicacao?ingresso=N) */
  ingressoInicial?: string;
}) {
  const t = escuro ? TEMA.escuro : TEMA.claro;
  const [estado, enviar] = useFormState(aplicar.bind(null, eventoId), inicial);
  const [ingressos, setIngressos] = useState(estado.campos?.ingressos ?? ingressoInicial ?? "");
  const [soube, setSoube] = useState(estado.campos?.soube ?? "");
  const v = (k: string) => estado.campos?.[k] ?? "";

  // O formulário é longo: depois de enviar, a confirmação fica no topo da tela (no celular a pessoa estaria lá embaixo)
  useEffect(() => { if (estado.ok) window.scrollTo({ top: 0 }); }, [estado.ok]);

  if (estado.ok) {
    return (
      <section className={t.ok} aria-live="polite">
        <h2 className={t.okTitulo}>Aplicação recebida.</h2>
        <p className={t.okTexto}>A gente fala com você pelo WhatsApp.</p>
      </section>
    );
  }

  const area = t.area;

  return (
    <form action={enviar} className="flex flex-col gap-6">
      {/* Armadilha para robô: pessoa não vê nem preenche */}
      <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      <Pergunta t={t} titulo={PERGUNTAS.nome} obrigatoria>
        <input name="nome" required maxLength={120} autoComplete="name" defaultValue={v("nome")} className={t.campo} />
      </Pergunta>

      <Pergunta t={t} titulo={PERGUNTAS.pronome} obrigatoria
        dica="Ex.: Mulher, hétero - Ela/Dela, Homem, homo - Ele/Dele, Não Binário - Elu/Delu...">
        <input name="pronome" required maxLength={200} defaultValue={v("pronome")} className={t.campo} />
      </Pergunta>

      <Pergunta t={t} titulo={PERGUNTAS.telefone} obrigatoria>
        <input name="telefone" type="tel" required inputMode="tel" autoComplete="tel" placeholder="(61) 90000-0000"
          defaultValue={v("telefone")} className={t.campo} />
      </Pergunta>

      <Pergunta t={t} titulo={PERGUNTAS.email} obrigatoria>
        <input name="email" type="email" required autoComplete="email" defaultValue={v("email")} className={t.campo} />
      </Pergunta>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[15px] font-medium">{PERGUNTAS.ingressos}<span className={t.ast} aria-hidden> *</span></legend>
        <div className={t.pilulas}>
          {INGRESSOS.map((x) => (
            <label key={x.n} className={`${t.pilula} ${ingressos === String(x.n) ? t.pilulaOn : ""}`}>
              <input type="radio" name="ingressos" value={x.n} required checked={ingressos === String(x.n)}
                onChange={(e) => setIngressos(e.target.value)} className="sr-only" />
              {x.t}
            </label>
          ))}
        </div>
      </fieldset>

      {Number(ingressos) > 1 && (
        <Pergunta t={t} titulo={PERGUNTAS.grupo} obrigatoria>
          <textarea name="grupo" required maxLength={1000} defaultValue={v("grupo")} className={area} />
        </Pergunta>
      )}

      <Pergunta t={t} titulo={PERGUNTAS.conhece} obrigatoria>
        <textarea name="conhece" required maxLength={1000} defaultValue={v("conhece")} className={area} />
      </Pergunta>

      <Pergunta t={t} titulo={PERGUNTAS.motivo} obrigatoria>
        <textarea name="motivo" required maxLength={1000} defaultValue={v("motivo")} className={area} />
      </Pergunta>

      <Pergunta t={t} titulo={PERGUNTAS.evitar} obrigatoria dica='Se não tiver, escreva "ninguém".'>
        <textarea name="evitar" required maxLength={1000} defaultValue={v("evitar")} className={area} />
      </Pergunta>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[15px] font-medium">{PERGUNTAS.soube}<span className={t.ast} aria-hidden> *</span></legend>
        <div className="flex flex-col gap-1">
          {COMO_SOUBE.map((x) => (
            <label key={x.t} className="flex min-h-[40px] cursor-pointer items-center gap-3 text-[15px] toque:min-h-[44px]">
              <input type="radio" name="soube" value={x.t} required checked={soube === x.t} onChange={(e) => setSoube(e.target.value)}
                className={`h-[18px] w-[18px] ${t.acento}`} />
              {x.t === "Outro" ? "Outro:" : x.t}
            </label>
          ))}
        </div>
        {soube === "Outro" && (
          <input name="soube_outro" required maxLength={200} aria-label="Como você soube (outro)" defaultValue={v("soube_outro")} className={t.campo} />
        )}
      </fieldset>

      <Pergunta t={t} titulo={PERGUNTAS.sugestoes} obrigatoria dica='Se não tiver, escreva "nenhuma".'>
        <textarea name="sugestoes" required maxLength={1000} defaultValue={v("sugestoes")} className={area} />
      </Pergunta>

      <p aria-live="polite" className={`min-h-[20px] text-[14px] font-medium ${t.erro}`}>{estado.erro}</p>
      <Enviar t={t} />
    </form>
  );
}
