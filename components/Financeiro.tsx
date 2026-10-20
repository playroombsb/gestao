"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { adicionarLancamento, removerLancamento } from "@/app/actions-gestao";
import { brl, parseNum } from "@/lib/calc";
import { nomeMes, somaMes } from "@/lib/crm";
import { hoje } from "@/lib/prazo";
import { useAutosave } from "@/lib/useAutosave";
import type { Lancamento } from "@/lib/types";
import Cabecalho, { PAGINA } from "./Cabecalho";
import StatusSalvo from "./StatusSalvo";

/*
  Custo fixo = custo recorrente: lançado uma vez, aparece em todo mês a partir da data dele.
  Custo variável = só no mês em que foi lançado.
*/

type Grupo = "receita" | "fixo" | "variavel";

const GRUPOS: { k: Grupo; t: string; titulo: string; dica: string }[] = [
  { k: "receita", t: "Receita", titulo: "Receitas", dica: "ex: workshop de spanking" },
  { k: "fixo", t: "Custo fixo", titulo: "Custos fixos", dica: "ex: aluguel do imóvel" },
  { k: "variavel", t: "Custo variável", titulo: "Custos variáveis", dica: "ex: faxina de sábado" },
];
const CATEGORIAS: Record<Exclude<Grupo, "receita">, string[]> = {
  fixo: ["Aluguel do imóvel", "Condomínio", "Contas", "Internet", "Ferramentas", "Equipe", "Impostos", "Outros"],
  variavel: ["Faxina", "Materiais", "Marketing", "Lavanderia", "Transporte", "Equipe", "Outros"],
};

const grupoDe = (l: Lancamento): Grupo => (l.tipo === "receita" ? "receita" : l.recorrente ? "fixo" : "variavel");

/** Recorrente aparece no mês com o mesmo dia da data original. */
const diaNoMes = (l: Lancamento, mes: string) => (l.recorrente && !l.data.startsWith(mes) ? `${mes}-${l.data.slice(8)}` : l.data);

export default function Financeiro({ mes, anterior, inicial, receitaAnterior, produtos }: {
  mes: string; anterior: string; inicial: Lancamento[]; receitaAnterior: number | null; produtos: string[];
}) {
  const [itens, setItens] = useState(inicial);
  const [armado, setArmado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Aqui não há edição com espera; o hook serve só para o "Salvando… / Salvo".
  const { status, rodar } = useAutosave<object>(async () => ({ ok: true }));

  const dataPadrao = hoje().startsWith(mes) ? hoje() : `${mes}-01`;
  const vazio = { grupo: "receita" as Grupo, data: dataPadrao, descricao: "", categoria: "", valor: "", repete: false };
  const [form, setForm] = useState(vazio);

  const calc = useMemo(() => {
    const de = (g: Grupo) => itens.filter((l) => grupoDe(l) === g);
    const soma = (xs: Lancamento[]) => xs.reduce((s, l) => s + l.valor, 0);
    const receitas = soma(de("receita"));
    const fixos = soma(de("fixo"));
    const variaveis = soma(de("variavel"));
    const porOrigem = Object.entries(de("receita").reduce<Record<string, number>>((m, l) => {
      const k = l.categoria || "Sem categoria";
      m[k] = (m[k] ?? 0) + l.valor;
      return m;
    }, {})).sort((a, b) => b[1] - a[1]);
    return { de, receitas, fixos, variaveis, resultado: receitas - fixos - variaveis, porOrigem };
  }, [itens]);

  const categorias = form.grupo === "receita"
    ? [...new Set(["Sessões", "Aluguéis", ...produtos, ...calc.de("receita").map((l) => l.categoria)])]
    : [...new Set([...CATEGORIAS[form.grupo], ...calc.de(form.grupo).map((l) => l.categoria)])].filter(Boolean);

  async function salvarNovo(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    const valor = parseNum(form.valor) ?? 0;
    if (valor <= 0) return setAviso("Informe um valor maior que zero.");
    const r = await rodar(() => adicionarLancamento({
      tipo: form.grupo === "receita" ? "receita" : "custo",
      recorrente: form.grupo === "fixo" || (form.grupo === "receita" && form.repete),
      data: form.data, descricao: form.descricao, categoria: form.categoria, valor,
    }));
    if (!r.ok) return;
    if (r.data.data.startsWith(mes) || (r.data.recorrente && r.data.data < somaMes(mes, 1))) setItens((xs) => [r.data, ...xs]);
    else setAviso(`Salvo em ${r.data.data.split("-").reverse().join("/")}, fora deste mês.`);
    setForm({ ...vazio, grupo: form.grupo });
  }

  async function apagar(l: Lancamento) {
    if (armado !== l.id) {
      setArmado(l.id);
      setTimeout(() => setArmado((a) => (a === l.id ? null : a)), 3000);
      return;
    }
    setArmado(null);
    const r = await rodar(() => removerLancamento(l.id));
    if (r.ok) setItens((xs) => xs.filter((x) => x.id !== l.id));
  }

  const variacao = receitaAnterior ? Math.round(((calc.receitas - receitaAnterior) / receitaAnterior) * 100) : null;

  function lista(g: Grupo) {
    const xs = calc.de(g).sort((a, b) => diaNoMes(b, mes).localeCompare(diaNoMes(a, mes)));
    const total = xs.reduce((s, l) => s + l.valor, 0);
    const info = GRUPOS.find((x) => x.k === g)!;
    return (
      <section key={g} aria-labelledby={`t-${g}`} className="cartao flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id={`t-${g}`} className="titulo-secao flex items-center gap-2">
            <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${g === "receita" ? "bg-ink" : g === "fixo" ? "bg-red" : "bg-red-soft ring-1 ring-red"}`} />
            {info.titulo}
          </h2>
          <span className={`text-[18px] font-extrabold tabular-nums ${g === "receita" ? "" : "text-red"}`}>{brl(total)}</span>
        </div>
        {g === "fixo" && <p className="text-[13px] text-muted">Lançados uma vez, repetem todo mês a partir da data.</p>}
        {xs.length === 0 ? (
          <p className="rounded-xl border-[1.5px] border-dashed border-line p-4 text-[13px] text-muted">Nada lançado.</p>
        ) : (
          <ul className="flex flex-col">
            {xs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line-soft py-2.5 last:border-0">
                <span className="w-12 text-[14px] tabular-nums text-muted">{diaNoMes(l, mes).slice(8)}/{mes.slice(5)}</span>
                <span className="min-w-0 flex-1 text-[14px]">
                  <span className="font-semibold">{l.descricao || l.categoria || "sem descrição"}</span>
                  {l.descricao && l.categoria && <span className="ml-1.5 text-[12px] text-muted">· {l.categoria}</span>}
                  {l.tipo === "receita" && l.recorrente && <span className="ml-1.5 text-[12px] font-semibold text-muted">· todo mês</span>}
                  {l.contato_id && <Link href={`/crm?c=${l.contato_id}`} className="ml-1.5 text-[12px] font-bold text-muted hover:text-red">· do CRM</Link>}
                </span>
                <span className="text-right text-[14px] font-bold tabular-nums">{brl(l.valor)}</span>
                {!l.contato_id && (
                  <button type="button" onClick={() => apagar(l)} aria-label={`Remover ${l.descricao || "lançamento"}`}
                    className={armado === l.id ? "rounded-full bg-red px-3 py-1 text-[12px] font-bold text-white" : "btn-icone text-lg"}>
                    {armado === l.id ? (l.recorrente ? "Remover de todos os meses?" : "Remover?") : "×"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <main className={PAGINA}>
      <Cabecalho rotulo="Gestão · Financeiro" titulo={<>Custos e <span className="text-red">receitas</span></>}
        acoes={
          <nav aria-label="Mês" className="flex items-center rounded-full border-[1.5px] border-ink bg-paper">
            <Link href={`/financeiro?mes=${anterior}`} aria-label="Mês anterior" className="flex h-[38px] w-10 items-center justify-center rounded-full text-lg font-bold hover:bg-bg toque:h-11 toque:w-11">‹</Link>
            <span className="min-w-[140px] px-1 text-center text-[14px] font-bold">{nomeMes(mes)}</span>
            <Link href={`/financeiro?mes=${somaMes(mes, 1)}`} aria-label="Próximo mês" className="flex h-[38px] w-10 items-center justify-center rounded-full text-lg font-bold hover:bg-bg toque:h-11 toque:w-11">›</Link>
          </nav>
        } />

      <div className="flex flex-wrap gap-px overflow-hidden rounded-2xl border border-line-soft bg-line-soft">
        {[
          ["Receitas", calc.receitas, variacao == null ? "sem mês anterior para comparar" : `${variacao >= 0 ? "+" : ""}${variacao}% vs mês anterior`],
          ["Custos fixos", calc.fixos, "repetem todo mês"],
          ["Custos variáveis", calc.variaveis, "só deste mês"],
        ].map(([t, v, nota]) => (
          <div key={t as string} className="flex flex-[1_1_180px] flex-col gap-1 bg-paper px-5 py-4">
            <span className="rotulo">{t}</span>
            <span className="text-[24px] font-extrabold tabular-nums">{brl(v as number)}</span>
            <span className="text-[13px] text-muted">{nota}</span>
          </div>
        ))}
        <div className="flex flex-[1_1_180px] flex-col gap-1 bg-ink px-5 py-4 text-white">
          <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-side-text">Resultado</span>
          <span className="text-[24px] font-extrabold tabular-nums">{brl(calc.resultado)}</span>
          <span className="text-[13px] font-bold text-red-vivo">
            {calc.receitas ? `margem ${Math.round((calc.resultado / calc.receitas) * 100)}%` : "sem receita no mês"}
          </span>
        </div>
      </div>

      <form onSubmit={salvarNovo} aria-labelledby="t-novo" className="cartao flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="t-novo" className="titulo-secao">Novo lançamento</h2>
          <StatusSalvo status={status} />
        </div>
        <div role="group" aria-label="Tipo de lançamento" className="segmento self-start">
          {GRUPOS.map((g) => (
            <button key={g.k} type="button" aria-pressed={form.grupo === g.k} onClick={() => setForm({ ...form, grupo: g.k, categoria: "" })}
              className={form.grupo === g.k && g.k !== "receita" ? "!bg-red" : ""}>
              {g.t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-4">
          <label className="flex flex-[0_1_160px] flex-col gap-1">
            <span className="rotulo">{form.grupo === "fixo" ? "A partir de" : "Data"}</span>
            <input type="date" required className="caixa" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </label>
          <label className="flex flex-[2_1_220px] flex-col gap-1">
            <span className="rotulo">Descrição</span>
            <input className="caixa" value={form.descricao} placeholder={GRUPOS.find((g) => g.k === form.grupo)!.dica}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </label>
          <label className="flex flex-[1_1_180px] flex-col gap-1">
            <span className="rotulo">Categoria</span>
            <input list="categorias" className="caixa" value={form.categoria} placeholder="escolha ou escreva"
              onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            <datalist id="categorias">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="flex flex-[0_1_140px] flex-col gap-1">
            <span className="rotulo">{form.grupo === "fixo" ? "Valor por mês (R$)" : "Valor (R$)"}</span>
            <input inputMode="decimal" required className={`caixa text-right font-bold`} value={form.valor} placeholder="0"
              onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </label>
          {form.grupo === "receita" && (
            <label className="flex min-h-[40px] items-center gap-2.5 text-[14px] toque:min-h-[44px]">
              <input type="checkbox" checked={form.repete} onChange={(e) => setForm({ ...form, repete: e.target.checked })}
                className="h-[18px] w-[18px] accent-ink" />
              Repete todo mês
            </label>
          )}
          <button type="submit" className="btn-1">Salvar</button>
        </div>
        {aviso && <p role="status" className="text-[14px] font-semibold text-red">{aviso}</p>}
        <p className="text-[13px] text-muted">Atendimentos realizados no CRM entram sozinhos como receita.</p>
      </form>

      {calc.porOrigem.length > 0 && (
        <section aria-label="Receitas por origem" className="cartao flex flex-col gap-3">
          <h2 className="titulo-secao">Receitas por origem</h2>
          {calc.porOrigem.map(([nome, v]) => (
            <div key={nome} className="flex items-center gap-2.5 text-[13px]">
              <span className="w-[140px] shrink-0 truncate" title={nome}>{nome}</span>
              <div className="h-2.5 flex-1 rounded-full bg-bg"><div className="h-2.5 rounded-full bg-ink" style={{ width: `${(v / calc.porOrigem[0][1]) * 100}%` }} /></div>
              <span className="w-[86px] shrink-0 text-right font-bold tabular-nums">{brl(v)}</span>
            </div>
          ))}
        </section>
      )}

      {lista("receita")}
      <div className="grid gap-5 lg:grid-cols-2">
        {lista("fixo")}
        {lista("variavel")}
      </div>
    </main>
  );
}
