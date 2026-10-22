import { listarPessoas } from "../actions";
import { listarContatos } from "../actions-gestao";
import { listarConversas, listarMensagens, marcarLida } from "../actions-whatsapp";
import { exigirAdmin } from "@/lib/auth";
import { estado } from "@/lib/evolution";
import Aviso from "@/components/Aviso";
import Conversas from "@/components/Conversas";

export const dynamic = "force-dynamic";

/** Conversas do WhatsApp do Playroom. Só admin. A conversa aberta fica na URL (?c=<id do WhatsApp>). */
export default async function Page({ searchParams }: { searchParams: { c?: string } }) {
  await exigirAdmin();
  const [conv, contatos, pessoas, whats] = await Promise.all([listarConversas(), listarContatos(), listarPessoas(), estado()]);
  if (!conv.ok) return <Aviso titulo="As conversas não carregaram." texto={conv.erro} />;

  const aberta = searchParams.c && conv.data.some((c) => c.jid === searchParams.c) ? searchParams.c : null;
  const msgs = aberta ? await listarMensagens(aberta) : null;
  if (aberta) await marcarLida(aberta);

  return (
    <Conversas
      inicial={conv.data.map((c) => (c.jid === aberta ? { ...c, nao_lidas: 0 } : c))}
      abertaInicial={aberta}
      mensagensIniciais={msgs?.ok ? msgs.data.mensagens : []}
      maisAntigasInicial={msgs?.ok ? msgs.data.maisAntigas : false}
      contatos={contatos.ok ? contatos.data.map((c) => ({ id: c.id, apelido: c.apelido })) : []}
      pessoas={pessoas.ok ? pessoas.data : []}
      estado={whats.estado}
      numero={whats.numero}
    />
  );
}
