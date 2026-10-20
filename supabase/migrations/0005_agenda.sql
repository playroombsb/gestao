-- Studio - SM: calendário. Sessões e aluguéis vêm do CRM (contatos.data_hora);
-- workshops, eventos e outros compromissos ficam aqui.

create table if not exists studio_sm.agenda (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null default '',
  tipo         text not null default 'evento' check (tipo in ('workshop', 'evento', 'outro')),
  inicio       timestamptz not null,
  fim          timestamptz,
  local        text not null default '',
  observacoes  text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists agenda_inicio_idx on studio_sm.agenda (inicio);

alter table studio_sm.agenda enable row level security;
revoke all on studio_sm.agenda from public, anon, authenticated;
grant select, insert, update, delete on studio_sm.agenda to service_role;

drop trigger if exists agenda_touch on studio_sm.agenda;
create trigger agenda_touch before update on studio_sm.agenda
  for each row execute function studio_sm.touch_updated_at();
