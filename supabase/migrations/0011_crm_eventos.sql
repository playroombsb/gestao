-- Studio - SM: pipeline de eventos no CRM.
-- Contato do tipo 'evento' fica ligado a um evento do calendário (agenda).
-- As etapas são as mesmas do banco; a tela dá nomes de evento a elas:
-- novo = Aplicação, conversa = Conversa, proposta = Ingresso enviado,
-- agendado = Pago, realizado = Compareceu, perdido = Não foi.

-- Tipo aceita 'evento' (remove a checagem antiga, qualquer que seja o nome dela)
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'studio_sm.contatos'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%tipo%'
  loop
    execute format('alter table studio_sm.contatos drop constraint %I', c);
  end loop;
end $$;

alter table studio_sm.contatos
  add constraint contatos_tipo_check check (tipo in ('sessao', 'aluguel', 'evento'));

alter table studio_sm.contatos
  add column if not exists evento_id uuid references studio_sm.agenda (id) on delete set null;

create index if not exists contatos_evento_idx on studio_sm.contatos (evento_id);

-- Receita automática: evento entra como categoria Eventos, na data do evento.
create or replace function studio_sm.sincronizar_receita() returns trigger
language plpgsql set search_path = '' as $$
declare
  ev_titulo text;
  ev_inicio timestamptz;
begin
  if new.etapa = 'realizado' then
    if new.tipo = 'evento' then
      select a.titulo, a.inicio into ev_titulo, ev_inicio from studio_sm.agenda a where a.id = new.evento_id;
    end if;
    insert into studio_sm.lancamentos (tipo, data, descricao, categoria, valor, contato_id)
    values (
      'receita',
      coalesce(
        (ev_inicio at time zone 'America/Sao_Paulo')::date,
        (new.data_hora at time zone 'America/Sao_Paulo')::date,
        current_date
      ),
      case new.tipo
        when 'aluguel' then 'Aluguel'
        when 'evento' then 'Evento' || coalesce(nullif(' · ' || ev_titulo, ' · '), '')
        else 'Sessão'
      end || coalesce(nullif(' · ' || new.apelido, ' · '), ''),
      case new.tipo when 'aluguel' then 'Aluguéis' when 'evento' then 'Eventos' else 'Sessões' end,
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
create trigger contatos_receita after insert or update of etapa, valor, data_hora, tipo, apelido, evento_id on studio_sm.contatos
  for each row execute function studio_sm.sincronizar_receita();

-- Formulário de aplicação dos eventos (página pública /evento/<id>): cai direto no pipeline do evento.
alter table studio_sm.contatos add column if not exists email text not null default '';
alter table studio_sm.contatos add column if not exists pronome text not null default '';
alter table studio_sm.contatos add column if not exists ingressos smallint check (ingressos between 1 and 3);
alter table studio_sm.contatos add column if not exists respostas jsonb not null default '[]'::jsonb; -- [{"pergunta": "...", "resposta": "..."}]
