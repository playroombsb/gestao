-- Studio - SM: etapas novas no pipeline de eventos, "Endereço enviado" e "Não aprovados" (decisões da Ana em 27/10/2026).
-- Ordem na tela do evento: Aplicação (novo), Conversa, Link enviado (proposta), Pago (agendado),
-- Endereço enviado (endereco), Compareceu (realizado), Não aprovados (nao_aprovado), Não foi (perdido).
-- Só muda a checagem da coluna etapa; nenhum dado é alterado.

do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'studio_sm.contatos'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%etapa%'
  loop
    execute format('alter table studio_sm.contatos drop constraint %I', c);
  end loop;
end $$;

alter table studio_sm.contatos
  add constraint contatos_etapa_check
  check (etapa in ('novo', 'conversa', 'proposta', 'agendado', 'endereco', 'realizado', 'nao_aprovado', 'perdido'));
