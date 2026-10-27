/** Endereço público do site da festa (o formulário de aplicação fica em /aplicacao). */
export const SITE_BAILE = "https://baile.playroombsb.com.br";

/** Ingressos do Baile dos Condenados (28/11/2026). Valor promocional até 07/11, inclusive, em Brasília. */
export const PROMO_ATE = "2026-11-07";

export const INGRESSOS_BAILE = [
  { n: 1, nome: "Individual", promo: 95, cheio: 120 },
  { n: 2, nome: "Dupla", promo: 180, cheio: 200 },
  { n: 3, nome: "Trio", promo: 220, cheio: 260 },
] as const;

const hojeBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
export const emPromo = (hoje = hojeBR()) => hoje <= PROMO_ATE;

/** Valor do ingresso hoje (vai para o CRM como valor do contato). */
export function precoHoje(n: number, hoje = hojeBR()) {
  const t = INGRESSOS_BAILE.find((x) => x.n === n);
  return t ? (emPromo(hoje) ? t.promo : t.cheio) : null;
}
