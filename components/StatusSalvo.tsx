import type { Status } from "@/lib/useAutosave";

export default function StatusSalvo({ status }: { status: Status }) {
  return (
    <span aria-live="polite" className={`shrink-0 text-xs font-semibold uppercase tracking-wider ${
      status.tom === "erro" ? "text-red" : status.tom === "ok" ? "text-ink" : "text-muted"}`}>
      {status.t}
    </span>
  );
}
