import { listarContatos, listarEventosCrm } from "../actions-gestao";
import { exigirLogin } from "@/lib/auth";
import Aviso from "@/components/Aviso";
import Crm from "@/components/Crm";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: { c?: string } }) {
  await exigirLogin();
  const [res, eventos] = await Promise.all([listarContatos(), listarEventosCrm()]);
  if (!res.ok) return <Aviso titulo="O CRM não carregou." texto={res.erro} />;
  if (!eventos.ok) return <Aviso titulo="O CRM não carregou." texto={eventos.erro} />;
  return <Crm inicial={res.data} eventos={eventos.data} abrir={searchParams.c} />;
}
