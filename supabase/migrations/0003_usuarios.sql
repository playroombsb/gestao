-- Studio - SM: usuários com login e senha. A senha fica só como hash scrypt (gerado em lib/senha.ts).
-- Os usuários iniciais são inseridos fora da migração, para o hash não ficar no repositório.

create table if not exists studio_sm.usuarios (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  login       text not null unique,   -- minúsculo, sem acento
  senha_hash  text not null,
  admin       boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table studio_sm.usuarios enable row level security;

revoke all on studio_sm.usuarios from public, anon, authenticated;
grant select, insert, update, delete on studio_sm.usuarios to service_role;

drop trigger if exists usuarios_touch on studio_sm.usuarios;
create trigger usuarios_touch before update on studio_sm.usuarios
  for each row execute function studio_sm.touch_updated_at();
