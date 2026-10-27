import { listarContatos, listarEventosCrm } from "../../actions-gestao";
import { exigirLogin } from "@/lib/auth";
import Aviso from "@/components/Aviso";
import ContatosLista from "@/components/ContatosLista";

export const dynamic = "force-dynamic";

export default async function Page() {
  await exigirLogin();
  const [res, eventos] = await Promise.all([listarContatos(), listarEventosCrm()]);
  if (!res.ok) return <Aviso titulo="Os contatos não carregaram." texto={res.erro} />;
  const nomes = Object.fromEntries((eventos.ok ? eventos.data : []).map((e) => [e.id, e.titulo || "Evento"]));
  return <ContatosLista contatos={res.data} eventos={nomes} />;
}
