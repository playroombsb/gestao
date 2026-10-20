import { listarContatos } from "../actions-gestao";
import { exigirLogin } from "@/lib/auth";
import Aviso from "@/components/Aviso";
import Crm from "@/components/Crm";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: { c?: string } }) {
  exigirLogin();
  const res = await listarContatos();
  if (!res.ok) return <Aviso titulo="O CRM não carregou." texto={res.erro} />;
  return <Crm inicial={res.data} abrir={searchParams.c} />;
}
