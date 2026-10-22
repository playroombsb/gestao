"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { conectarWhatsapp, desconectarWhatsapp, estadoWhatsapp } from "@/app/actions-whatsapp";
import { telefoneBonito } from "@/lib/whatsapp";

type Estado = "conectado" | "conectando" | "desconectado" | "sem_instancia" | "indisponivel";

const CONFERE_MS = 3000;
const NOVO_QR_MS = 30_000; // o código do WhatsApp vence em cerca de 40 segundos

/** Conectar e desconectar o WhatsApp do Playroom (QR code). Fica em Admin › Integrações. */
export default function WhatsappConexao({ inicial, numero, nome }: { inicial: Estado; numero?: string; nome?: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState(inicial);
  const [qr, setQr] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [armado, setArmado] = useState(false);

  // Enquanto o QR está na tela: confere a cada 3 s se o celular leu, e troca o código antes de vencer
  useEffect(() => {
    if (!qr) return;
    const confere = setInterval(async () => {
      const r = await estadoWhatsapp();
      if (r.ok && r.data.estado === "conectado") {
        setQr(null);
        setEstado("conectado");
        router.refresh();
      }
    }, CONFERE_MS);
    const renova = setInterval(async () => {
      const r = await conectarWhatsapp();
      if (r.ok && r.data.qr) setQr(r.data.qr);
    }, NOVO_QR_MS);
    return () => { clearInterval(confere); clearInterval(renova); };
  }, [qr, router]);

  async function conectar() {
    setOcupado(true);
    setErro("");
    const r = await conectarWhatsapp();
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    if (r.data.qr) setQr(r.data.qr);
    else { setEstado("conectado"); router.refresh(); }
  }

  async function desconectar() {
    if (!armado) {
      setArmado(true);
      setTimeout(() => setArmado(false), 3000);
      return;
    }
    setArmado(false);
    setOcupado(true);
    const r = await desconectarWhatsapp();
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    setEstado("desconectado");
    router.refresh();
  }

  if (estado === "indisponivel") {
    return (
      <p className="rounded-lg bg-red-soft px-3 py-2.5 text-[13px] text-red-deep">
        A Evolution não respondeu. Confira se ela está no ar na VPS e se EVOLUTION_URL e EVOLUTION_API_KEY estão no servidor.
      </p>
    );
  }

  if (estado === "conectado") {
    return (
      <div className="flex flex-col gap-4">
        <dl className="grid gap-4 text-[14px] sm:grid-cols-2">
          <div><dt className="rotulo">Número</dt><dd className="font-semibold">{numero ? telefoneBonito(numero) : "conectado"}</dd></div>
          {nome && <div><dt className="rotulo">Nome no WhatsApp</dt><dd className="font-semibold">{nome}</dd></div>}
        </dl>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/conversas" className="btn-1">Abrir conversas</Link>
          <button type="button" onClick={desconectar} disabled={ocupado} className={armado ? "btn-perigo" : "btn-3 hover:!text-red"}>
            {armado ? "Desconectar mesmo?" : "Desconectar"}
          </button>
        </div>
        {erro && <p role="alert" className="text-[13px] font-semibold text-red">{erro}</p>}
        <p className="text-[13px] text-muted">
          Desconectar tira o sistema dos aparelhos conectados do celular. As conversas que já chegaram continuam aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {qr ? (
        <div className="flex flex-wrap items-start gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code para conectar o WhatsApp" className="h-56 w-56 rounded-lg border border-line-soft bg-white p-2" />
          <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-3">
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[14px]">
              <li>No celular do Playroom, abra o WhatsApp.</li>
              <li>Toque em <strong>Configurações</strong> (iPhone) ou nos <strong>três pontinhos</strong> (Android).</li>
              <li>Entre em <strong>Dispositivos conectados</strong> e toque em <strong>Conectar dispositivo</strong>.</li>
              <li>Aponte a câmera para o código ao lado.</li>
            </ol>
            <p className="text-[13px] text-muted">O código se renova sozinho. Assim que o celular ler, esta tela muda.</p>
            <button type="button" onClick={() => setQr(null)} className="btn-3 self-start px-0">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={conectar} disabled={ocupado} className="btn-1">
            {ocupado ? "Gerando código…" : "Conectar o WhatsApp"}
          </button>
          <span className="text-[13px] text-muted">Use o celular com o número do Playroom.</span>
        </div>
      )}
      {erro && <p role="alert" className="text-[13px] font-semibold text-red">{erro}</p>}
    </div>
  );
}
