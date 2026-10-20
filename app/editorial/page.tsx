import { listarSecoes } from "../actions";
import { listarPautas } from "../actions-gestao";
import { exigirLogin } from "@/lib/auth";
import Aviso from "@/components/Aviso";
import Cabecalho, { PAGINA } from "@/components/Cabecalho";
import Pautas from "@/components/Pautas";
import Secoes from "@/components/Secoes";

export const dynamic = "force-dynamic";

export default async function Page() {
  await exigirLogin();
  const [secoes, pautas] = await Promise.all([listarSecoes("editorial"), listarPautas()]);
  if (!secoes.ok) return <Aviso titulo="A linha editorial não carregou." texto={secoes.erro} />;
  if (!pautas.ok) return <Aviso titulo="A linha editorial não carregou." texto={pautas.erro} />;

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Marketing · Linha editorial" titulo={<>O que a casa <span className="text-red">fala</span></>} />
      <Pautas inicial={pautas.data} />
      <Secoes pagina="editorial" inicial={secoes.data} />
    </main>
  );
}
