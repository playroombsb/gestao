import { listarSecoes } from "../actions";
import { exigirLogin } from "@/lib/auth";
import Aviso from "@/components/Aviso";
import Cabecalho, { PAGINA } from "@/components/Cabecalho";
import Secoes from "@/components/Secoes";

export const dynamic = "force-dynamic";

// Notas do teste de arquétipo de marca. O posicionamento usa Governante e Amante (decisão da Ana em 20/10/2026);
// o Rebelde, que liderou o teste, entra como tempero.
const NOTAS = [
  { nome: "Rebelde", n: 89, cor: "bg-side-label" },
  { nome: "Amante", n: 85, cor: "bg-white" },
  { nome: "Cuidador", n: 85, cor: "bg-side-label" },
  { nome: "Explorador", n: 75, cor: "bg-side-label" },
  { nome: "Governante", n: 75, cor: "bg-red" },
];

export default async function Page() {
  await exigirLogin();
  const res = await listarSecoes("posicionamento");
  if (!res.ok) return <Aviso titulo="O posicionamento não carregou." texto={res.erro} />;

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Marketing · Posicionamento" titulo={<>Quem a casa <span className="text-red">é</span></>} />

      <section aria-labelledby="t-arq" className="flex flex-wrap gap-8 rounded-2xl bg-ink bg-[linear-gradient(165deg,#2b1216_0%,#150c0d_45%,#0d0a0a_80%)] p-6 text-white md:p-8">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
          <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-side-text">Arquétipo</span>
          <h2 id="t-arq" className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Governante <span className="text-red-vivo">com</span> Amante
          </h2>
          <p className="text-[15px] leading-relaxed text-[#e9e2e0]">
            Quem conduz é ela: regra clara, tudo combinado antes, autoridade pela calma. O que a pessoa leva é desejo e
            presença, a sensação de ser escolhida. O Rebelde fica como tempero, pra tirar o BDSM do tabu.
          </p>
          <dl className="grid gap-x-6 gap-y-1.5 pt-1 text-[13px] text-side-text sm:grid-cols-2">
            <div><dt className="inline font-bold text-white">Conduz </dt><dd className="inline">com regra, combinado e calma</dd></div>
            <div><dt className="inline font-bold text-white">Entrega </dt><dd className="inline">desejo, presença, ser escolhido</dd></div>
            <div><dt className="inline font-bold text-white">Voz </dt><dd className="inline">calma, terna, firme nas decisões</dd></div>
            <div><dt className="inline font-bold text-white">Cuidado </dt><dd className="inline">controle virar frieza</dd></div>
          </dl>
        </div>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col justify-center gap-2.5">
          {NOTAS.map((x) => (
            <div key={x.nome} className="flex items-center gap-2.5 text-[13px]">
              <span className="w-[84px]">{x.nome}</span>
              <div className="h-2 flex-1 rounded-full bg-side-line"><div className={`h-2 rounded-full ${x.cor}`} style={{ width: `${x.n}%` }} /></div>
              <span className="w-6 text-right font-bold tabular-nums">{x.n}</span>
            </div>
          ))}
          <span className="text-[13px] text-side-text">Notas do teste. Em destaque, os dois usados no posicionamento. Menos presente: Cara Comum (44).</span>
        </div>
      </section>

      <Secoes pagina="posicionamento" inicial={res.data} />
    </main>
  );
}
