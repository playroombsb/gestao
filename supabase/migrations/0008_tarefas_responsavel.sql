-- Studio - SM: responsável por tarefa (uma das usuárias do sistema). Usuária removida: a tarefa fica sem responsável.
alter table studio_sm.tarefas add column if not exists responsavel_id uuid references studio_sm.usuarios(id) on delete set null;
