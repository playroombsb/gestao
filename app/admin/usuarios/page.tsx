import { listarUsuarios } from "../../actions-admin";
import { exigirAdmin } from "@/lib/auth";
import Aviso from "@/components/Aviso";
import Usuarios from "@/components/Usuarios";

export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await exigirAdmin();
  const res = await listarUsuarios();
  if (!res.ok) return <Aviso titulo="Os usuários não carregaram." texto={res.erro} />;
  return <Usuarios inicial={res.data} eu={s.id} />;
}
