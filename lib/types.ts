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

export type Pagina = "posicionamento" | "editorial";
export type Secao = { id: string; titulo: string; conteudo: string; ordem: number };
export type SecaoPatch = Partial<Omit<Secao, "id">>;

export type Tarefa = { id: string; titulo: string; feita: boolean; prazo: string | null; ordem: number };
export type TarefaPatch = Partial<Omit<Tarefa, "id">>;

export const ETAPAS = [
  { k: "novo", t: "Novo contato" },
  { k: "conversa", t: "Conversa" },
  { k: "proposta", t: "Proposta" },
  { k: "agendado", t: "Agendado" },
  { k: "realizado", t: "Realizado" },
  { k: "perdido", t: "Perdido" },
] as const;
export type Etapa = (typeof ETAPAS)[number]["k"];

export type Contato = {
  id: string;
  apelido: string;
  contato: string;
  tipo: "sessao" | "aluguel";
  etapa: Etapa;
  data_hora: string | null; // ISO
  duracao: string;
  valor: number | null;
  sinal: "pago" | "pendente" | "sem";
  origem: string;
  motivo_perda: string;
  observacoes: string;
  created_at: string;
};
export type ContatoPatch = Partial<Omit<Contato, "id" | "created_at">>;

export type Resposta = { pergunta: string; resposta: string };
export type StatusAplicacao = "nova" | "analise" | "aprovada" | "recusada";
export type Aplicacao = {
  id: string;
  apelido: string;
  contato: string;
  interesse: string;
  respostas: Resposta[];
  status: StatusAplicacao;
  nota: string;
  contato_id: string | null;
  created_at: string;
};

export type Lancamento = {
  id: string;
  tipo: "receita" | "custo";
  data: string; // AAAA-MM-DD
  descricao: string;
  categoria: string;
  valor: number;
  recorrente: boolean;
  contato_id: string | null;
};

export type Pauta = {
  id: string;
  titulo: string;
  pilar: string;
  formato: string;
  funil: string;
  status: string;
  data: string | null;
  ordem: number;
};
export type PautaPatch = Partial<Omit<Pauta, "id">>;

export type Insta = {
  coletado_em: string;
  perfil: string;
  seguidores: number | null;
  seguindo: number | null;
  posts: number | null;
  media_curtidas: number | null;
  media_comentarios: number | null;
  engajamento: number | null;
  posts_30d: number | null;
};
