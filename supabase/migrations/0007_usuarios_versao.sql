-- Studio - SM: versão da sessão por usuário. Vai no cookie; trocar senha, mudar admin
-- ou "encerrar sessões" aumenta a versão e derruba os logins abertos daquele usuário.
alter table studio_sm.usuarios add column if not exists versao integer not null default 1;
