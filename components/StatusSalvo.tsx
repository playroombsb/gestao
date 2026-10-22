import type { Status } from "@/lib/useAutosave";

export default function StatusSalvo({ status }: { status: Status }) {
  return (
    <span aria-live="polite" className={`shrink-0 whitespace-nowrap text-[12px] font-medium uppercase tracking-wider ${
      status.tom === "erro" ? "text-red" : status.tom === "ok" ? "text-muted" : "text-apagado"}`}>
      {status.t}
    </span>
  );
}
