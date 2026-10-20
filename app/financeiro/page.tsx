import { listar } from "../actions";
import { listarLancamentos } from "../actions-gestao";
import { exigirLogin } from "@/lib/auth";
import { mesAtual } from "@/lib/crm";
import Aviso from "@/components/Aviso";
import Financeiro from "@/components/Financeiro";

export const dynamic = "force-dynamic";

function mesAnterior(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

export default async function Page({ searchParams }: { searchParams: { mes?: string } }) {
  exigirLogin();
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : mesAtual();
  const [atual, anterior, produtos] = await Promise.all([listarLancamentos(mes), listarLancamentos(mesAnterior(mes)), listar()]);
  if (!atual.ok) return <Aviso titulo="O financeiro não carregou." texto={atual.erro} />;

  const receitaAnterior = anterior.ok ? anterior.data.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0) : null;
  const nomesProdutos = produtos.ok ? produtos.data.map((p) => p.nome).filter(Boolean) : [];

  return <Financeiro key={mes} mes={mes} anterior={mesAnterior(mes)} inicial={atual.data}
    receitaAnterior={receitaAnterior} produtos={nomesProdutos} />;
}
