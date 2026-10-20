-- Studio - SM: tarefas em kanban. Status (a fazer, fazendo, feito) substitui o booleano "feita",
-- e cada tarefa pode ter uma etiqueta.

alter table studio_sm.tarefas add column if not exists status text not null default 'a_fazer'
  check (status in ('a_fazer', 'fazendo', 'feito'));
alter table studio_sm.tarefas add column if not exists etiqueta text
  check (etiqueta in ('nao_iniciado', 'aguardando_revisao', 'concluido', 'publicado'));

update studio_sm.tarefas set status = 'feito' where feita and status = 'a_fazer';
alter table studio_sm.tarefas drop column if exists feita;
