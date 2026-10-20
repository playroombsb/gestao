export default function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center gap-3 px-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red">Studio - SM</p>
      <h1 className="text-3xl font-extrabold tracking-tight">{titulo}</h1>
      <p className="text-muted">{texto}</p>
    </main>
  );
}
