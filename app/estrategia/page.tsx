import { listarSecoes } from "../actions";
import { exigirLogin } from "@/lib/auth";
import Aviso from "@/components/Aviso";
import Estrategia from "@/components/Estrategia";

export const dynamic = "force-dynamic";

export default async function Page() {
  exigirLogin();
  const res = await listarSecoes();
  if (!res.ok) return <Aviso titulo="A estratégia não carregou." texto={res.erro} />;
  return <Estrategia inicial={res.data} />;
}
