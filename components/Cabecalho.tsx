/** Cabeçalho padrão das páginas: rótulo vermelho, título grande, texto e ações à direita. */
export default function Cabecalho({ rotulo, titulo, texto, acoes }: {
  rotulo: string;
  titulo: React.ReactNode;
  texto?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-red pb-6 md:pb-7">
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red">{rotulo}</p>
        <h1 className="text-balance text-[clamp(34px,6vw,56px)] font-extrabold leading-none tracking-[-0.035em]">{titulo}</h1>
        {texto && <p className="text-base text-ink/80">{texto}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2.5">{acoes}</div>}
    </header>
  );
}

export const PAGINA = "mx-auto flex max-w-[1080px] flex-col gap-8 px-4 pb-16 pt-6 md:gap-10 md:px-8 md:pt-10";
export const CARTAO = "border border-line bg-paper p-5 md:p-6";
export const BOTAO = "min-h-[44px] border-2 border-red bg-red px-[18px] text-[13px] font-bold tracking-wide text-white hover:brightness-110 disabled:opacity-60";
export const BOTAO_2 = "min-h-[44px] border-2 border-ink px-[18px] text-[13px] font-bold tracking-wide hover:bg-ink hover:text-white";
