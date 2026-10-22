"use client";

import { useFormState, useFormStatus } from "react-dom";
import { entrar } from "@/app/login/actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="btn-1 mt-2 w-full">
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export default function Entrar() {
  const [erro, enviar] = useFormState(entrar, null);
  return (
    <form action={enviar} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span className="rotulo">Usuário</span>
        <input name="usuario" autoComplete="username" autoCapitalize="none" required autoFocus
          className="caixa" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="rotulo">Senha</span>
        <input name="senha" type="password" autoComplete="current-password" required
          className="caixa" />
      </label>
      <p aria-live="polite" className="min-h-[20px] text-[14px] font-medium text-red">{erro}</p>
      <Botao />
    </form>
  );
}
