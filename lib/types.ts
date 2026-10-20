export type Campo = "ticket" | "margem" | "vendas";

export type Produto = {
  id: string;
  nome: string;
  descricao: string;
  ticket: number | null;
  margem: number | null;
  vendas: number | null;
  ticket_ns: boolean;
  margem_ns: boolean;
  vendas_ns: boolean;
  ordem: number;
};

export type ProdutoPatch = Partial<Omit<Produto, "id">>;

export type Secao = { id: string; titulo: string; conteudo: string; ordem: number };
export type SecaoPatch = Partial<Omit<Secao, "id">>;

export type Tarefa = { id: string; titulo: string; feita: boolean; ordem: number };
export type TarefaPatch = Partial<Omit<Tarefa, "id">>;
