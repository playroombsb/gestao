"use client";

import { useFormState, useFormStatus } from "react-dom";
import { entrar } from "@/app/login/actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="mt-2 min-h-[48px] border-2 border-red bg-red px-[18px] text-[13px] font-bold tracking-wide text-white hover:brightness-110 disabled:opacity-60">
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export default function Entrar() {
  const [erro, enviar] = useFormState(entrar, null);
  return (
    <form action={enviar} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span className="label">Usuário</span>
        <input name="usuario" autoComplete="username" autoCapitalize="none" required autoFocus
          className="campo text-lg font-semibold" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">Senha</span>
        <input name="senha" type="password" autoComplete="current-password" required
          className="campo text-lg font-semibold" />
      </label>
      <p aria-live="polite" className="min-h-[20px] text-sm font-semibold text-red">{erro}</p>
      <Botao />
    </form>
  );
}
