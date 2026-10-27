/** Perguntas do formulário de aplicação dos eventos (Play Party). A ordem é a da tela e a das respostas no CRM. */
export const PERGUNTAS = {
  nome: "Qual é o seu nome?",
  pronome: "Com qual gênero e pronome de tratamento você se identifica?",
  telefone: "Telefone (WhatsApp)",
  email: "E-mail",
  ingressos: "Quantos ingressos você quer?",
  grupo: "Se está comprando mais de 1 ingresso, qual o nome das outras pessoas e quem será o \"responsável pelo grupo\"?",
  conhece: "Já foi a algum evento do Playroom ou conhece a Mistress Sandra?",
  motivo: "O que te motiva a participar do evento?",
  evitar: "Tem alguém que você NÃO quer encontrar na festa, por gatilhos ou experiências ruins anteriores? Abra seu coração para a Mistress Sandra.",
  soube: "Como você soube da Play Party?",
  sugestoes: "Dúvidas ou sugestões para deixar a experiência da festa melhor?",
} as const;

/** Opções de "Como você soube" e a origem que cada uma vira no CRM. */
export const COMO_SOUBE = [
  { t: "Instagram", origem: "Instagram" },
  { t: "Kinkgram / Fetlife / Fet", origem: "Kinkgram / Fetlife" },
  { t: "Grupo do Telegram ou WhatsApp", origem: "Grupo Telegram ou WhatsApp" },
  { t: "Indicação de amigue", origem: "Indicação" },
  { t: "Outro", origem: "Outro" },
] as const;

export type EstadoAplicacao = { ok: boolean; erro: string | null; campos?: Record<string, string> };
