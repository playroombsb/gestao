import { listarSecoes } from "../actions";
import { exigirLogin } from "@/lib/auth";
import Aviso from "@/components/Aviso";
import Cabecalho, { PAGINA } from "@/components/Cabecalho";
import Secoes from "@/components/Secoes";

export const dynamic = "force-dynamic";

// Resultado do teste de arquétipo de marca
const NOTAS = [
  { nome: "Rebelde", n: 89, cor: "bg-red" },
  { nome: "Amante", n: 85, cor: "bg-white" },
  { nome: "Cuidador", n: 85, cor: "bg-side-label" },
  { nome: "Explorador", n: 75, cor: "bg-side-label" },
];

export default async function Page() {
  exigirLogin();
  const res = await listarSecoes("posicionamento");
  if (!res.ok) return <Aviso titulo="O posicionamento não carregou." texto={res.erro} />;

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Marketing · Posicionamento" titulo={<>Quem a casa <span className="text-red">é</span></>} />

      <section aria-labelledby="t-arq" className="flex flex-wrap gap-8 bg-ink p-6 text-white md:p-8">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-side-text">Arquétipo</span>
          <h2 id="t-arq" className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Rebelde <span className="text-red-vivo">com</span> Amante
          </h2>
          <p className="text-[15px] leading-relaxed text-[#e9e2e0]">
            A marca que quebra as regras que não servem mais. O Amante entra como tempero, com a promessa: você merece se
            sentir especial.
          </p>
          <dl className="grid gap-x-6 gap-y-1.5 pt-1 text-[13px] text-side-text sm:grid-cols-2">
            <div><dt className="inline font-bold text-white">Desejo </dt><dd className="inline">revolução, ruptura</dd></div>
            <div><dt className="inline font-bold text-white">Medo </dt><dd className="inline">impotência, irrelevância</dd></div>
            <div><dt className="inline font-bold text-white">Voz </dt><dd className="inline">provocativa, crua, irreverente</dd></div>
            <div><dt className="inline font-bold text-white">Cuidado </dt><dd className="inline">destruir sem construir</dd></div>
          </dl>
        </div>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col justify-center gap-2.5">
          {NOTAS.map((x) => (
            <div key={x.nome} className="flex items-center gap-2.5 text-[13px]">
              <span className="w-[84px]">{x.nome}</span>
              <div className="h-2 flex-1 bg-side-line"><div className={`h-2 ${x.cor}`} style={{ width: `${x.n}%` }} /></div>
              <span className="w-6 text-right font-bold tabular-nums">{x.n}</span>
            </div>
          ))}
          <span className="text-[12px] text-side-text">Menos presente: Cara Comum (44). Desempate: Rebelde, 2 de 2.</span>
        </div>
      </section>

      <Secoes pagina="posicionamento" inicial={res.data} />
    </main>
  );
}
