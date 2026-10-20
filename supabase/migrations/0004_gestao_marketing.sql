-- Studio - SM: menu lateral com Marketing e Gestão.
-- Tarefas com prazo, seções por página, CRM, aplicações do site, financeiro, pautas e métricas do Instagram.
-- Mesmo padrão das outras tabelas: só service_role, RLS ligado e sem policies.

-- Tarefas ganham prazo
alter table studio_sm.tarefas add column if not exists prazo date;

-- Seções de texto passam a servir duas páginas: posicionamento e editorial
alter table studio_sm.estrategia add column if not exists pagina text not null default 'posicionamento'
  check (pagina in ('posicionamento', 'editorial'));

-- CRM: sessões e aluguéis
create table if not exists studio_sm.contatos (
  id            uuid primary key default gen_random_uuid(),
  apelido       text not null default '',
  contato       text not null default '',
  tipo          text not null default 'sessao' check (tipo in ('sessao', 'aluguel')),
  etapa         text not null default 'novo' check (etapa in ('novo', 'conversa', 'proposta', 'agendado', 'realizado', 'perdido')),
  data_hora     timestamptz,
  duracao       text not null default '',
  valor         numeric,
  sinal         text not null default 'sem' check (sinal in ('pago', 'pendente', 'sem')),
  origem        text not null default 'Instagram',
  motivo_perda  text not null default '',
  observacoes   text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Aplicações que chegam do formulário do site
create table if not exists studio_sm.aplicacoes (
  id          uuid primary key default gen_random_uuid(),
  apelido     text not null default '',
  contato     text not null default '',
  interesse   text not null default '',
  respostas   jsonb not null default '[]'::jsonb,  -- [{"pergunta": "...", "resposta": "..."}]
  status      text not null default 'nova' check (status in ('nova', 'analise', 'aprovada', 'recusada')),
  nota        text not null default '',
  contato_id  uuid references studio_sm.contatos(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Financeiro. Recorrente = repete todo mês a partir da data (custo fixo).
create table if not exists studio_sm.lancamentos (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('receita', 'custo')),
  data        date not null default current_date,
  descricao   text not null default '',
  categoria   text not null default '',
  valor       numeric not null default 0,
  recorrente  boolean not null default false,
  contato_id  uuid unique references studio_sm.contatos(id) on delete cascade,  -- receita gerada pelo CRM
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Banco de pautas da linha editorial
create table if not exists studio_sm.pautas (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null default '',
  pilar       text not null default '',
  formato     text not null default 'Reels',
  funil       text not null default 'Topo',
  status      text not null default 'Ideia',
  data        date,
  ordem       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Coletas do perfil do Instagram (scraper na VPS)
create table if not exists studio_sm.instagram (
  id                 bigint generated always as identity primary key,
  coletado_em        timestamptz not null default now(),
  perfil             text not null,
  seguidores         integer,
  seguindo           integer,
  posts              integer,
  media_curtidas     numeric,
  media_comentarios  numeric,
  engajamento        numeric,   -- % (curtidas + comentários) / seguidores, média dos últimos posts
  posts_30d          integer
);
create index if not exists instagram_coletado_idx on studio_sm.instagram (perfil, coletado_em desc);

do $$
declare t text;
begin
  foreach t in array array['contatos', 'aplicacoes', 'lancamentos', 'pautas', 'instagram'] loop
    execute format('alter table studio_sm.%I enable row level security', t);
    execute format('revoke all on studio_sm.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on studio_sm.%I to service_role', t);
  end loop;
  foreach t in array array['contatos', 'aplicacoes', 'lancamentos', 'pautas'] loop
    execute format('drop trigger if exists %1$s_touch on studio_sm.%1$I', t);
    execute format('create trigger %1$s_touch before update on studio_sm.%1$I for each row execute function studio_sm.touch_updated_at()', t);
  end loop;
end $$;

-- Atendimento em "realizado" vira receita sozinho; saiu de "realizado", a receita sai junto.
create or replace function studio_sm.sincronizar_receita() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.etapa = 'realizado' then
    insert into studio_sm.lancamentos (tipo, data, descricao, categoria, valor, contato_id)
    values (
      'receita',
      coalesce((new.data_hora at time zone 'America/Sao_Paulo')::date, current_date),
      case new.tipo when 'aluguel' then 'Aluguel' else 'Sessão' end || coalesce(nullif(' · ' || new.apelido, ' · '), ''),
      case new.tipo when 'aluguel' then 'Aluguéis' else 'Sessões' end,
      coalesce(new.valor, 0),
      new.id
    )
    on conflict (contato_id) do update set
      data = excluded.data, descricao = excluded.descricao, categoria = excluded.categoria, valor = excluded.valor;
  else
    delete from studio_sm.lancamentos where contato_id = new.id;
  end if;
  return new;
end $$;

revoke all on function studio_sm.sincronizar_receita() from public, anon, authenticated;

drop trigger if exists contatos_receita on studio_sm.contatos;
create trigger contatos_receita after insert or update of etapa, valor, data_hora, tipo, apelido on studio_sm.contatos
  for each row execute function studio_sm.sincronizar_receita();

-- Posicionamento: o arquétipo vira o bloco fixo do topo da página; as seções editáveis seguem o wireframe.
delete from studio_sm.estrategia where titulo = 'Arquétipo de marca' and pagina = 'posicionamento';
update studio_sm.estrategia set titulo = 'Declaração de posicionamento', ordem = 1,
  conteudo = 'Para [quem] que [dor ou desejo], o Playroom é [categoria] que [benefício principal]. Diferente de [alternativa], aqui [prova ou diferença].'
  where titulo = 'Posicionamento' and pagina = 'posicionamento' and conteudo = '';
update studio_sm.estrategia set ordem = 7 where titulo = 'Cliente ideal' and pagina = 'posicionamento';

insert into studio_sm.estrategia (pagina, titulo, conteudo, ordem)
select * from (values
  ('posicionamento', 'Promessa', 'Você merece se sentir especial.', 2),
  ('posicionamento', 'Headline e bio', '', 3),
  ('posicionamento', 'Pilares de mensagem', '', 4),
  ('posicionamento', 'Tom de voz', $t$Somos: provocativa, crua, irreverente.
Não somos: agressiva, polêmica vazia para engajar, ataque a pessoas, destruir sem construir.$t$, 5),
  ('posicionamento', 'Palavras que usamos', 'chega, mentira, quebre, verdade, sistema, ninguém te conta, pare de, liberdade', 6),
  ('editorial', 'Objetivo do perfil', '', 1),
  ('editorial', 'Pilares de conteúdo', '', 2),
  ('editorial', 'Funil', $t$70% topo · Atração: feed, conteúdo compartilhável.
20% meio · Conexão: você é o produto.
10% fundo · Conversão: fechamento.$t$, 3),
  ('editorial', 'Semana padrão', $t$Seg:
Ter:
Qua:
Qui:
Sex:
Sáb:
Dom:$t$, 4),
  ('editorial', 'Limites da plataforma', '', 5)
) as v(pagina, titulo, conteudo, ordem)
where not exists (select 1 from studio_sm.estrategia e where e.pagina = v.pagina and e.titulo = v.titulo);

-- Tarefas: próximos passos do mapa de fluxos e as primeiras do projeto
insert into studio_sm.tarefas (titulo, ordem)
select titulo, ordem from (values
  ('Criar conta nas ferramentas', 1),
  ('Criar os textos pro site', 2),
  ('Separar os materiais de conteúdo técnico pro site/blog', 3),
  ('Site + ranquear no Google', 4),
  ('Blog com SEO para busca e venda de experiências', 5),
  ('Usar o WhatsApp de forma estratégica', 6),
  ('Lista de transmissão: conteúdo educacional, avisos de eventos, aluguel e cursos', 7),
  ('Anunciar em sites de motel', 8),
  ('Parceria com sexólogas para eventos', 9),
  ('Pacotes por tipo de público e campanhas sazonais', 10),
  ('Experiência que acompanhe alguns pacotes', 11),
  ('Repensar o pernoite', 12),
  ('BDSM Teste', 13)
) as v(titulo, ordem)
where not exists (select 1 from studio_sm.tarefas t where t.titulo = v.titulo);
