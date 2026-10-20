import { listarAplicacoes } from "../actions-gestao";
import { exigirLogin } from "@/lib/auth";
import Aplicacoes from "@/components/Aplicacoes";
import Aviso from "@/components/Aviso";

export const dynamic = "force-dynamic";

const STATUS = ["nova", "analise", "aprovada", "recusada"] as const;

export default async function Page({ searchParams }: { searchParams: { f?: string; a?: string } }) {
  await exigirLogin();
  const res = await listarAplicacoes();
  if (!res.ok) return <Aviso titulo="As aplicações não carregaram." texto={res.erro} />;
  const f = STATUS.find((x) => x === searchParams.f);
  return <Aplicacoes inicial={res.data} filtroInicial={f} abertaInicial={searchParams.a} />;
}
