/** Carregamento do site da festa: fundo escuro, sem o esqueleto claro do sistema. */
export default function Carregando() {
  return (
    <main aria-busy="true" aria-label="Carregando" className="flex min-h-screen flex-1 items-center justify-center bg-[#060607]">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#333] border-t-[#ff2a44]" />
    </main>
  );
}
