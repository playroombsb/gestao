import { listarTarefas } from "../actions";
import { exigirLogin } from "@/lib/auth";
import Aviso from "@/components/Aviso";
import Tarefas from "@/components/Tarefas";

export const dynamic = "force-dynamic";

export default async function Page() {
  await exigirLogin();
  const res = await listarTarefas();
  if (!res.ok) return <Aviso titulo="As tarefas não carregaram." texto={res.erro} />;
  return <Tarefas inicial={res.data} />;
}
