import type { Secao } from "./types";

// Bloco fixo do arquétipo. O posicionamento usa Governante e Amante (decisão da Ana em 20/10/2026);
// o Rebelde, que liderou o teste, entra como tempero.
export const ARQUETIPO = {
  titulo: "Governante com Amante",
  texto: "Quem conduz é ela: regra clara, tudo combinado antes, autoridade pela calma. O que a pessoa leva é desejo e presença, a sensação de ser escolhida. O Rebelde fica como tempero, pra tirar o BDSM do tabu.",
  traços: [
    ["Conduz", "com regra, combinado e calma"],
    ["Entrega", "desejo, presença, ser escolhido"],
    ["Voz", "calma, terna, firme nas decisões"],
    ["Cuidado", "controle virar frieza"],
  ] as const,
  notas: [
    { nome: "Rebelde", n: 89 },
    { nome: "Amante", n: 85, usado: true },
    { nome: "Cuidador", n: 85 },
    { nome: "Explorador", n: 75 },
    { nome: "Governante", n: 75, usado: true },
  ],
  menosPresente: "Cara Comum (44)",
};

/** Posicionamento inteiro em Markdown, pronto para dar de contexto a um agente de IA. */
export function posicionamentoMd(secoes: Secao[], geradoEm = new Date()) {
  const data = geradoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const linhas = [
    "# Posicionamento do Playroom",
    "",
    `Exportado do sistema de gestão em ${data}.`,
    "",
    `## Arquétipo: ${ARQUETIPO.titulo}`,
    "",
    ARQUETIPO.texto,
    "",
    ...ARQUETIPO.traços.map(([k, v]) => `- **${k}:** ${v}`),
    "",
    `Notas do teste de arquétipos: ${ARQUETIPO.notas.map((x) => `${x.nome} ${x.n}${x.usado ? " (usado)" : ""}`).join(", ")}. Menos presente: ${ARQUETIPO.menosPresente}.`,
  ];
  for (const s of secoes) {
    linhas.push("", `## ${s.titulo.trim() || "Sem título"}`, "", s.conteudo.trim() || "_(vazio)_");
  }
  return linhas.join("\n") + "\n";
}
