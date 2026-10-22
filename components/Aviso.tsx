export default function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center gap-3 px-5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-red">Playroom</p>
      <h1 className="text-3xl font-extrabold tracking-tight">{titulo}</h1>
      <p className="text-muted">{texto}</p>
    </main>
  );
}
