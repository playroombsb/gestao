import { listarAplicacoes } from "../actions-gestao";
import { exigirLogin } from "@/lib/auth";
import Aplicacoes from "@/components/Aplicacoes";
import Aviso from "@/components/Aviso";

export const dynamic = "force-dynamic";

export default async function Page() {
  await exigirLogin();
  const res = await listarAplicacoes();
  if (!res.ok) return <Aviso titulo="As aplicações não carregaram." texto={res.erro} />;
  return <Aplicacoes inicial={res.data} />;
}
