import { listar } from "./actions";
import Painel from "@/components/Painel";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: { k?: string } }) {
  const k = searchParams.k ?? "";
  const res = await listar(k);

  if (!res.ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-3 px-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red">Studio - SM</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Este link não abre a página.</h1>
        <p className="text-muted">{res.erro}</p>
      </main>
    );
  }

  return <Painel chave={k} inicial={res.data} />;
}
