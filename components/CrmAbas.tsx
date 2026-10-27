import Link from "next/link";

/** Abas do CRM: o pipeline e a lista de contatos. */
export default function CrmAbas({ atual }: { atual: "pipeline" | "contatos" }) {
  return (
    <nav aria-label="CRM" className="flex flex-wrap gap-1.5">
      <Link href="/crm" aria-pressed={atual === "pipeline"} className="pilula">Pipeline</Link>
      <Link href="/crm/contatos" aria-pressed={atual === "contatos"} className="pilula">Contatos</Link>
    </nav>
  );
}
