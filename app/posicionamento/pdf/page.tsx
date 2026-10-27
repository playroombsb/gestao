import { listarSecoes } from "../../actions";
import { exigirLogin } from "@/lib/auth";
import Aviso from "@/components/Aviso";
import Imprimir from "@/components/Imprimir";
import { ARQUETIPO } from "@/lib/posicionamento";

export const dynamic = "force-dynamic";
export const metadata = { title: "Posicionamento do Playroom" };

/** Versão para salvar em PDF: o navegador abre a janela de impressão sozinho ("Salvar como PDF"). */
export default async function Page() {
  await exigirLogin();
  const res = await listarSecoes("posicionamento");
  if (!res.ok) return <Aviso titulo="O posicionamento não carregou." texto={res.erro} />;
  const data = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-8 bg-paper px-6 py-10 print:max-w-none print:px-0 print:py-0">
      <Imprimir />
      <header className="flex flex-col gap-2 border-b-2 border-red pb-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-red">Playroom · Posicionamento</p>
        <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em]">Posicionamento do Playroom</h1>
        <p className="text-[13px] text-muted">Exportado em {data}</p>
      </header>

      <section className="flex flex-col gap-2 break-inside-avoid">
        <h2 className="text-[20px] font-semibold">Arquétipo: {ARQUETIPO.titulo}</h2>
        <p className="text-[15px] leading-relaxed">{ARQUETIPO.texto}</p>
        <ul className="flex flex-col gap-0.5 text-[14px]">
          {ARQUETIPO.traços.map(([k, v]) => <li key={k}><strong>{k}:</strong> {v}</li>)}
        </ul>
        <p className="text-[13px] text-muted">
          Notas do teste: {ARQUETIPO.notas.map((x) => `${x.nome} ${x.n}`).join(", ")}. Menos presente: {ARQUETIPO.menosPresente}.
        </p>
      </section>

      {res.data.map((s) => (
        <section key={s.id} className="flex flex-col gap-2">
          <h2 className="break-after-avoid text-[20px] font-semibold">{s.titulo || "Sem título"}</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{s.conteudo || "(vazio)"}</p>
        </section>
      ))}
    </main>
  );
}
