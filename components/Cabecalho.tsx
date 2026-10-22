/** Cabeçalho padrão das páginas: rótulo vermelho, título, texto e ações à direita. */
export default function Cabecalho({ rotulo, titulo, texto, acoes }: {
  rotulo: string;
  titulo: React.ReactNode;
  texto?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-red pb-5 md:pb-6">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-red">{rotulo}</p>
        <h1 className="text-balance text-[clamp(28px,4vw,40px)] font-extrabold leading-[1.05] tracking-[-0.03em]">{titulo}</h1>
        {texto && <p className="text-[15px] text-ink/80">{texto}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2.5">{acoes}</div>}
    </header>
  );
}

export const PAGINA = "mx-auto flex max-w-[1120px] flex-col gap-7 px-4 pb-16 pt-6 md:gap-8 md:px-8 md:pt-9";
