import { exigirLogin } from "@/lib/auth";
import Cabecalho, { PAGINA } from "@/components/Cabecalho";
import MinhaSenha from "@/components/MinhaSenha";

export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await exigirLogin();
  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Minha conta" titulo={s.nome} texto={s.admin ? "Você é admin." : undefined} />
      <MinhaSenha />
    </main>
  );
}
