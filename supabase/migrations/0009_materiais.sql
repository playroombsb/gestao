-- Studio - SM: materiais de apoio (PDFs, conteúdos, prompts, modelos, links), agrupados por seção.
-- Arquivos no bucket privado studio-sm-materiais; só o servidor (service_role) lê e grava, e o download
-- passa por /api/materiais/<id>, que confere a sessão.

create table if not exists studio_sm.materiais (
  id                uuid primary key default gen_random_uuid(),
  secao             text not null default 'Geral',
  titulo            text not null default '',
  descricao         text not null default '',
  tipo              text not null default 'pdf' check (tipo in ('pdf', 'conteudo', 'prompt', 'modelo', 'link', 'outro')),
  conteudo          text not null default '',   -- texto de prompts e conteúdos
  link              text not null default '',
  arquivo_path      text,                        -- caminho no bucket
  arquivo_nome      text,
  arquivo_tamanho   integer,
  ordem             integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table studio_sm.materiais enable row level security;
revoke all on studio_sm.materiais from public, anon, authenticated;
grant select, insert, update, delete on studio_sm.materiais to service_role;

drop trigger if exists materiais_touch on studio_sm.materiais;
create trigger materiais_touch before update on studio_sm.materiais
  for each row execute function studio_sm.touch_updated_at();

insert into storage.buckets (id, name, public, file_size_limit)
values ('studio-sm-materiais', 'studio-sm-materiais', false, 52428800)
on conflict (id) do nothing;
