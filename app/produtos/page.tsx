import { listar } from "../actions";
import { exigirLogin } from "@/lib/auth";
import Produtos from "@/components/Produtos";
import Aviso from "@/components/Aviso";

export const dynamic = "force-dynamic";

export default async function Page() {
  await exigirLogin();
  const res = await listar();
  if (!res.ok) return <Aviso titulo="A página não carregou." texto={res.erro} />;
  return <Produtos inicial={res.data} />;
}
