-- Studio - SM: conversas do WhatsApp do Playroom (Evolution API).
-- A Evolution avisa cada mensagem pelo webhook /api/whatsapp/webhook e o servidor grava aqui uma cópia
-- (decisão da Ana em 22/10/2026). Só conversas individuais: grupos e status ficam de fora.
-- Fotos, áudios e documentos não são copiados: ficam na Evolution e abrem sob demanda por
-- /api/whatsapp/midia/<id>, só para admin.

create table if not exists studio_sm.wa_conversas (
  jid             text primary key,                 -- id do WhatsApp (5561...@s.whatsapp.net ou ...@lid)
  nome            text not null default '',         -- nome que a pessoa usa no WhatsApp
  telefone        text not null default '',         -- só dígitos, quando o WhatsApp informa
  contato_id      uuid references studio_sm.contatos(id) on delete set null,
  ultima_em       timestamptz,
  ultima_previa   text not null default '',
  ultima_de_mim   boolean not null default false,
  nao_lidas       integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists wa_conversas_ultima on studio_sm.wa_conversas (ultima_em desc nulls last);

create table if not exists studio_sm.wa_mensagens (
  id              text primary key,                 -- key.id da mensagem no WhatsApp
  jid             text not null references studio_sm.wa_conversas(jid) on delete cascade,
  de_mim          boolean not null default false,
  tipo            text not null default 'texto'
                  check (tipo in ('texto', 'imagem', 'audio', 'video', 'documento', 'figurinha', 'localizacao', 'contato', 'outro')),
  texto           text not null default '',         -- texto ou legenda
  midia_nome      text,
  midia_mime      text,
  status          text not null default '' check (status in ('', 'pendente', 'enviada', 'entregue', 'lida', 'erro')),
  enviada_por     uuid references studio_sm.usuarios(id) on delete set null, -- quem respondeu pelo sistema
  em              timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists wa_mensagens_conversa on studio_sm.wa_mensagens (jid, em desc);

alter table studio_sm.wa_conversas enable row level security;
alter table studio_sm.wa_mensagens enable row level security;
revoke all on studio_sm.wa_conversas, studio_sm.wa_mensagens from public, anon, authenticated;
grant select, insert, update, delete on studio_sm.wa_conversas, studio_sm.wa_mensagens to service_role;

drop trigger if exists wa_conversas_touch on studio_sm.wa_conversas;
create trigger wa_conversas_touch before update on studio_sm.wa_conversas
  for each row execute function studio_sm.touch_updated_at();

-- Cada mensagem nova atualiza a conversa: prévia, horário e contador de não lidas.
-- Mensagem fora de ordem (mais antiga que a última) não mexe na prévia.
create or replace function studio_sm.wa_atualizar_conversa() returns trigger
language plpgsql set search_path = '' as $$
declare
  previa text := case
    when new.tipo = 'texto' then new.texto
    when new.tipo = 'imagem' then '📷 Foto' || case when new.texto <> '' then ': ' || new.texto else '' end
    when new.tipo = 'audio' then '🎤 Áudio'
    when new.tipo = 'video' then '🎬 Vídeo' || case when new.texto <> '' then ': ' || new.texto else '' end
    when new.tipo = 'documento' then '📄 ' || coalesce(nullif(new.midia_nome, ''), 'Documento')
    when new.tipo = 'figurinha' then 'Figurinha'
    when new.tipo = 'localizacao' then '📍 Localização'
    when new.tipo = 'contato' then '👤 Contato'
    else 'Mensagem'
  end;
begin
  update studio_sm.wa_conversas c set
    ultima_em     = greatest(coalesce(c.ultima_em, new.em), new.em),
    ultima_previa = case when c.ultima_em is null or new.em >= c.ultima_em then left(previa, 200) else c.ultima_previa end,
    ultima_de_mim = case when c.ultima_em is null or new.em >= c.ultima_em then new.de_mim else c.ultima_de_mim end,
    -- Respondeu (pelo sistema ou pelo celular): a conversa conta como lida
    nao_lidas     = case when new.de_mim then 0 else c.nao_lidas + 1 end
  where c.jid = new.jid;
  return new;
end $$;

drop trigger if exists wa_mensagens_conversa on studio_sm.wa_mensagens;
create trigger wa_mensagens_conversa after insert on studio_sm.wa_mensagens
  for each row execute function studio_sm.wa_atualizar_conversa();

revoke all on function studio_sm.wa_atualizar_conversa() from public, anon, authenticated;
