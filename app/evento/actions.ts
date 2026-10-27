"use server";

import { headers } from "next/headers";
import { db } from "@/lib/supabase";
import { eventoAberto } from "@/lib/evento-publico";
import { COMO_SOUBE, PERGUNTAS, type EstadoAplicacao } from "@/lib/aplicacao-evento";
import { INGRESSOS } from "@/lib/types";
import { precoHoje } from "@/lib/baile";

// Página pública: sem login. Limite simples por IP, em memória (zera ao recriar o container).
const JANELA = 10 * 60_000;
const MAX_POR_JANELA = 5;
const envios = new Map<string, number[]>();

function excedeu(ip: string) {
  const agora = Date.now();
  const recentes = (envios.get(ip) ?? []).filter((t) => agora - t < JANELA);
  if (recentes.length >= MAX_POR_JANELA) return true;
  envios.set(ip, [...recentes, agora]);
  if (envios.size > 5_000) envios.clear();
  return false;
}

const campo = (f: FormData, k: string, max = 1_000) => String(f.get(k) ?? "").trim().slice(0, max);

export async function aplicar(eventoId: string, _antes: EstadoAplicacao, f: FormData): Promise<EstadoAplicacao> {
  const campos = Object.fromEntries([...f.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]));
  const erro = (e: string): EstadoAplicacao => ({ ok: false, erro: e, campos });

  if (campo(f, "site")) return { ok: true, erro: null }; // armadilha para robô: finge que deu certo

  const ip = (headers().get("x-forwarded-for") ?? "").split(",")[0].trim() || "sem-ip";
  if (excedeu(ip)) return erro("Muitos envios seguidos. Tente de novo em alguns minutos.");

  const ev = await eventoAberto(eventoId);
  if (!ev) return erro("Este evento não está mais aceitando aplicações.");
  if (ev.encerrado) return erro("As aplicações para este evento já foram encerradas.");

  const nome = campo(f, "nome", 120);
  const pronome = campo(f, "pronome", 200);
  const telefone = campo(f, "telefone", 40);
  const email = campo(f, "email", 200).toLowerCase();
  const ingressos = Number(campo(f, "ingressos", 2));
  const grupo = campo(f, "grupo");
  const soube = campo(f, "soube", 60);
  const soubeOutro = campo(f, "soube_outro", 200);
  const conhece = campo(f, "conhece");
  const motivo = campo(f, "motivo");
  const evitar = campo(f, "evitar");
  const sugestoes = campo(f, "sugestoes");

  // Todas as perguntas são obrigatórias (decisão da Ana em 27/10/2026)
  if (!nome) return erro("Escreva o seu nome.");
  if (!pronome) return erro("Conte com qual gênero e pronome você se identifica.");
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 13) return erro("Confira o telefone com DDD.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return erro("Confira o e-mail.");
  const opcao = INGRESSOS.find((x) => x.n === ingressos);
  if (!opcao) return erro("Escolha quantos ingressos você quer.");
  if (ingressos > 1 && !grupo) return erro("Escreva o nome das outras pessoas e quem é responsável pelo grupo.");
  if (!conhece) return erro("Conte se já foi a algum evento do Playroom ou se conhece a Mistress Sandra.");
  if (!motivo) return erro("Conte o que te motiva a participar.");
  if (!evitar) return erro("Responda se tem alguém que você não quer encontrar (se não tiver, escreva \"ninguém\").");
  const comoSoube = COMO_SOUBE.find((x) => x.t === soube);
  if (!comoSoube) return erro("Conte como você soube da Play Party.");
  if (comoSoube.t === "Outro" && !soubeOutro) return erro("Conte como você soube da Play Party.");
  if (!sugestoes) return erro("Deixe uma dúvida ou sugestão (se não tiver, escreva \"nenhuma\").");

  const respostas = [
    { pergunta: PERGUNTAS.nome, resposta: nome },
    { pergunta: PERGUNTAS.pronome, resposta: pronome },
    { pergunta: PERGUNTAS.telefone, resposta: telefone },
    { pergunta: PERGUNTAS.email, resposta: email },
    { pergunta: PERGUNTAS.ingressos, resposta: opcao.t },
    { pergunta: PERGUNTAS.grupo, resposta: ingressos > 1 ? grupo : "" },
    { pergunta: PERGUNTAS.conhece, resposta: conhece },
    { pergunta: PERGUNTAS.motivo, resposta: motivo },
    { pergunta: PERGUNTAS.evitar, resposta: evitar },
    { pergunta: PERGUNTAS.soube, resposta: comoSoube.t === "Outro" ? `Outro: ${soubeOutro}` : comoSoube.t },
    { pergunta: PERGUNTAS.sugestoes, resposta: sugestoes },
  ];

  const { error } = await db().from("contatos").insert({
    apelido: nome, contato: telefone, email, pronome, ingressos,
    tipo: "evento", evento_id: ev.id, etapa: "novo",
    origem: comoSoube.origem,
    valor: precoHoje(ingressos), // preço do dia da aplicação (promo ou cheio)
    respostas,
  });
  if (error) {
    // Banco ainda sem a migração 0011: a aplicação não se perde, entra em Operação › Aplicações
    const { error: e2 } = await db().from("aplicacoes").insert({
      apelido: nome, contato: telefone,
      interesse: `${ev.titulo || "Evento"} · ${opcao.t}`,
      respostas: respostas.filter((r) => r.resposta),
    });
    if (e2) return erro("Não foi possível enviar agora. Tente de novo em instantes.");
  }
  return { ok: true, erro: null };
}
