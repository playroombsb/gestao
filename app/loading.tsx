import { PAGINA } from "@/components/Cabecalho";

/** Aparece na hora do clique, enquanto a página busca os dados. Evita a sensação de tela travada. */
export default function Carregando() {
  const bloco = "animate-pulse rounded-2xl bg-[#ebe6e4]";
  return (
    <main className={PAGINA} aria-busy="true" aria-label="Carregando">
      <div className="flex flex-col gap-3 border-b-2 border-red pb-5 md:pb-6">
        <div className="h-3 w-24 animate-pulse rounded-full bg-[#ebe6e4]" />
        <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-[#ebe6e4]" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className={`${bloco} h-48`} />
        <div className={`${bloco} h-48`} />
      </div>
      <div className={`${bloco} h-64`} />
    </main>
  );
}
