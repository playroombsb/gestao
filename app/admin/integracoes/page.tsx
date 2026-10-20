import { headers } from "next/headers";
import { exigirAdmin } from "@/lib/auth";
import { PERFIL } from "@/lib/instagram";
import { db } from "@/lib/supabase";
import Cabecalho, { PAGINA } from "@/components/Cabecalho";
import Copiar from "@/components/Copiar";

export const dynamic = "force-dynamic";

type Estado = "ativa" | "atencao" | "desligada";
const SELO: Record<Estado, [string, string]> = {
  ativa: ["Ativa", "bg-ink text-white"],
  atencao: ["Precisa de atenção", "bg-red text-white"],
  desligada: ["Não conectada", "border-[1.5px] border-line text-muted"],
};

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function Cartao({ nome, estado, resumo, children }: { nome: string; estado: Estado; resumo: string; children?: React.ReactNode }) {
  return (
    <section aria-label={nome} className="cartao flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="titulo-secao">{nome}</h2>
          <p className="text-[14px] text-ink/80">{resumo}</p>
        </div>
        <span className={`shrink-0 selo ${SELO[estado][1]}`}>{SELO[estado][0]}</span>
      </div>
      {children}
    </section>
  );
}

const Passos = ({ itens }: { itens: React.ReactNode[] }) => (
  <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[14px]">{itens.map((t, i) => <li key={i}>{t}</li>)}</ol>
);

export default async function Page() {
  await exigirAdmin();
  const h = headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;

  const [ultApp, ultInsta] = await Promise.all([
    db().from("aplicacoes").select("created_at").order("created_at", { ascending: false }).limit(1),
    db().from("instagram").select("coletado_em").eq("perfil", PERFIL).order("coletado_em", { ascending: false }).limit(1),
  ]);
  const appEm = ultApp.data?.[0]?.created_at as string | undefined;
  const instaEm = ultInsta.data?.[0]?.coletado_em as string | undefined;
  const instaHoras = instaEm ? (Date.now() - Date.parse(instaEm)) / 3_600_000 : Infinity;

  const icsToken = process.env.AGENDA_ICS_TOKEN;
  const appToken = Boolean(process.env.APLICACOES_TOKEN);

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Gestão · Integrações" titulo={<>O que conversa com o <span className="text-red">sistema</span></>}
        texto="Conexões com outras ferramentas. Chaves de acesso ficam só no servidor; o único link secreto mostrado aqui é o da agenda." />

      <Cartao nome="Google Agenda" estado={icsToken ? "ativa" : "desligada"}
        resumo="Sessões, aluguéis, workshops e eventos do Calendário aparecem no Google Agenda. Mão única: o que muda no Google não volta para cá.">
        {icsToken ? (
          <>
            <Copiar rotulo="Link da agenda para assinar" valor={`${base}/api/agenda?t=${icsToken}`} />
            <Passos itens={[
              <>No computador, abra o Google Agenda.</>,
              <>Na coluna da esquerda, em <strong>Outras agendas</strong>, clique em <strong>+</strong> e depois em <strong>Do URL</strong>.</>,
              <>Cole o link acima e clique em <strong>Adicionar agenda</strong>. Ela aparece como &ldquo;Playroom&rdquo;.</>,
            ]} />
            <p className="rounded-lg bg-bg px-3 py-2.5 text-[13px] text-muted">
              O Google atualiza agendas assinadas sozinho, a cada algumas horas. Quem tiver esse link vê os apelidos da agenda: não mande para ninguém de fora.
            </p>
          </>
        ) : <p className="text-[14px] text-muted">Falta configurar AGENDA_ICS_TOKEN no servidor.</p>}
      </Cartao>

      <Cartao nome="Site: formulário de aplicações" estado={appToken ? "ativa" : "desligada"}
        resumo="Cada envio do formulário do site cai em Aplicações como &ldquo;Nova&rdquo;.">
        <dl className="grid gap-4 text-[14px] sm:grid-cols-3">
          <div><dt className="rotulo">Endereço</dt><dd className="break-all font-mono text-[13px]">{base}/api/aplicacoes</dd></div>
          <div><dt className="rotulo">Token</dt><dd className="font-semibold">{appToken ? "configurado no servidor" : "falta configurar"}</dd></div>
          <div><dt className="rotulo">Última recebida</dt><dd className="font-semibold">{appEm ? quando(appEm) : "nenhuma ainda"}</dd></div>
        </dl>
        <p className="text-[13px] text-muted">O site manda direto do servidor dele, nunca do navegador, para o token não vazar.</p>
      </Cartao>

      <Cartao nome="Instagram" estado={instaHoras < 8 * 24 ? "ativa" : "atencao"}
        resumo={`Coleta semanal dos números públicos de @${PERFIL} (seguidores, seguindo e posts), mostrados no Início.`}>
        <dl className="grid gap-4 text-[14px] sm:grid-cols-2">
          <div><dt className="rotulo">Última coleta</dt><dd className="font-semibold">{instaEm ? quando(instaEm) : "nenhuma"}</dd></div>
          <div><dt className="rotulo">Agendada</dt><dd className="font-semibold">toda segunda às 9h</dd></div>
        </dl>
        {instaHoras >= 8 * 24 && (
          <p className="rounded-lg bg-red-soft px-3 py-2.5 text-[13px] text-red-deep">
            O Instagram bloqueia a coleta feita do servidor. Para voltar a funcionar sozinha, é preciso um proxy residencial ou rodar a coleta em outro computador.
          </p>
        )}
      </Cartao>

      <Cartao nome="WhatsApp (Evolution)" estado="desligada"
        resumo="Nenhuma conexão feita. Quando for a hora, daqui saem avisos de nova aplicação e confirmações de sessão." />
    </main>
  );
}
