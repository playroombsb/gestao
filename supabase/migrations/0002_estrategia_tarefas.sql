-- Studio - SM: seções editáveis da estratégia e lista de tarefas do projeto.
-- Mesmo padrão de produtos: só o servidor (service_role) acessa, RLS ligado e sem policies.

create table if not exists studio_sm.estrategia (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null default '',
  conteudo    text not null default '',
  ordem       integer not null default 0,
  updated_at  timestamptz not null default now()
);

create table if not exists studio_sm.tarefas (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null default '',
  feita       boolean not null default false,
  ordem       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table studio_sm.estrategia enable row level security;
alter table studio_sm.tarefas enable row level security;

revoke all on studio_sm.estrategia, studio_sm.tarefas from public, anon, authenticated;
grant select, insert, update, delete on studio_sm.estrategia, studio_sm.tarefas to service_role;

drop trigger if exists estrategia_touch on studio_sm.estrategia;
create trigger estrategia_touch before update on studio_sm.estrategia
  for each row execute function studio_sm.touch_updated_at();

drop trigger if exists tarefas_touch on studio_sm.tarefas;
create trigger tarefas_touch before update on studio_sm.tarefas
  for each row execute function studio_sm.touch_updated_at();

-- Seed: arquétipo definido no teste de marca; posicionamento e cliente ideal ficam para preencher.
insert into studio_sm.estrategia (titulo, conteudo, ordem)
select * from (values
  ('Arquétipo de marca', $t$Rebelde com Amante.
A marca que quebra as regras que não servem mais. O Amante entra como tempero, com a promessa: você merece se sentir especial.

Notas: Rebelde 89, Amante 85, Cuidador 85, Explorador 75. Nas perguntas de desempate, Rebelde venceu 2 de 2. Orientação: estabilidade e controle. Menos presente: Cara Comum (44).

Desejo central: revolução, ruptura.
Medo: impotência, irrelevância.
Voz: provocativa, crua, irreverente.
Palavras que combinam: chega, mentira, quebre, verdade, sistema, ninguém te conta, pare de, liberdade.

Onde tomar cuidado: destruir sem construir, polêmica vazia para engajar, agressividade, atacar pessoas em vez de ideias, incoerência (criticar o que faz).$t$, 1),
  ('Posicionamento', '', 2),
  ('Cliente ideal', '', 3)
) as v(titulo, conteudo, ordem)
where not exists (select 1 from studio_sm.estrategia);
