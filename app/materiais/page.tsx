import { listarMateriais } from "../actions-materiais";
import { exigirLogin } from "@/lib/auth";
import Aviso from "@/components/Aviso";
import Materiais from "@/components/Materiais";

export const dynamic = "force-dynamic";

export default async function Page() {
  await exigirLogin();
  const res = await listarMateriais();
  if (!res.ok) return <Aviso titulo="Os materiais não carregaram." texto={res.erro} />;
  return <Materiais inicial={res.data} />;
}
