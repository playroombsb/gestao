import { listarAgenda, listarContatos } from "../actions-gestao";
import { exigirLogin } from "@/lib/auth";
import { mesAtual } from "@/lib/crm";
import Aviso from "@/components/Aviso";
import Calendario from "@/components/Calendario";

export const dynamic = "force-dynamic";

/** Primeiro domingo e sábado final que cercam o mês, em AAAA-MM-DD. */
function grade(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const ini = new Date(Date.UTC(a, m - 1, 1));
  ini.setUTCDate(1 - ini.getUTCDay());
  const fim = new Date(Date.UTC(a, m, 0));
  fim.setUTCDate(fim.getUTCDate() + (6 - fim.getUTCDay()));
  const dias: string[] = [];
  for (const d = new Date(ini); d <= fim; d.setUTCDate(d.getUTCDate() + 1)) dias.push(d.toISOString().slice(0, 10));
  return dias;
}

export default async function Page({ searchParams }: { searchParams: { mes?: string } }) {
  await exigirLogin();
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : mesAtual();
  const dias = grade(mes);
  // Limites em horário de Brasília (UTC-3)
  const de = new Date(`${dias[0]}T00:00:00-03:00`).toISOString();
  const ate = new Date(Date.parse(`${dias[dias.length - 1]}T00:00:00-03:00`) + 86_400_000).toISOString();

  const [agenda, contatos] = await Promise.all([listarAgenda(de, ate), listarContatos()]);
  if (!agenda.ok) return <Aviso titulo="O calendário não carregou." texto={agenda.erro} />;
  if (!contatos.ok) return <Aviso titulo="O calendário não carregou." texto={contatos.erro} />;

  const doCrm = contatos.data.filter((c) => c.tipo !== "evento" && c.data_hora && ["proposta", "agendado", "realizado"].includes(c.etapa)
    && c.data_hora >= de && c.data_hora < ate);

  return <Calendario key={mes} mes={mes} dias={dias} eventos={agenda.data} contatos={doCrm} />;
}
