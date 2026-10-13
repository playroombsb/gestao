-- Studio - SM: produtos avaliados por ticket médio, margem e vendas por mês.
-- Acesso só pelo servidor (service_role). RLS ligado e sem policies: anon não lê nem escreve.

create table if not exists public.produtos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null default '',
  descricao   text not null default '',
  ticket      numeric,             -- R$ por venda
  margem      numeric,             -- % de lucro sobre o ticket
  vendas      numeric,             -- vendas por mês
  ticket_ns   boolean not null default false,  -- "não sei"
  margem_ns   boolean not null default false,
  vendas_ns   boolean not null default false,
  ordem       integer not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.produtos enable row level security;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists produtos_touch on public.produtos;
create trigger produtos_touch before update on public.produtos
  for each row execute function public.touch_updated_at();

-- Seed: os 10 produtos trazidos pela dona do Playroom
insert into public.produtos (nome, descricao, ordem) values
  ('Sessões privativas remuneradas', 'Organizar, profissionalizar e otimizar os atendimentos', 1),
  ('Play Parties', 'Festas periódicas com operação estruturada', 2),
  ('Roupas e acessórios de látex', 'Marca própria de confecção', 3),
  ('Velas para wax play', 'Fabricação e venda nacional', 4),
  ('Locação do espaço Playroom', 'Aluguel do ambiente, mobiliário e equipamentos', 5),
  ('Sex shop fetichista', 'Produtos especializados', 6),
  ('Cursos e aulas online', 'Conhecimento em formato digital', 7),
  ('Conteúdo audiovisual comercial', 'Vídeos temáticos monetizados', 8),
  ('Podcast e conteúdo educativo', 'Desmistificar o BDSM e reduzir o preconceito', 9),
  ('Workshops e cursos presenciais', 'Formação prática e teórica', 10);
