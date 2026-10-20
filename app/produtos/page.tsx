import { listar } from "../actions";
import { exigirLogin } from "@/lib/auth";
import Painel from "@/components/Painel";
import Aviso from "@/components/Aviso";

export const dynamic = "force-dynamic";

export default async function Page() {
  exigirLogin();
  const res = await listar();
  if (!res.ok) return <Aviso titulo="A página não carregou." texto={res.erro} />;
  return <Painel inicial={res.data} />;
}
