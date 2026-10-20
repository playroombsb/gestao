import { redirect } from "next/navigation";
import { sessao } from "@/lib/auth";
import Entrar from "@/components/Entrar";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (await sessao()) redirect("/");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-7 px-5 py-10">
      <header className="flex flex-col gap-3 border-b-2 border-red pb-6">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-red">Playroom</p>
        <h1 className="text-[36px] font-extrabold leading-none tracking-[-0.03em]">Entrar</h1>
      </header>
      <Entrar />
    </main>
  );
}
