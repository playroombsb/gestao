# Studio - SM

Sistema de gestão do Playroom (casa de BDSM em Brasília), com menu lateral:
- **Início**: próximas 7 tarefas, números do Instagram e resumo do CRM.
- **Calendário**: sessões e aluguéis do CRM (proposta, agendado, realizado) mais workshops, eventos e outros da tabela `agenda`.
- **Tarefas** (com prazo) e **Aplicações** (envios do formulário do site; aprovar cria o contato no CRM).
- **Marketing**: Estratégia (mapa de fluxos do negócio, fixo no código), Posicionamento (arquétipo fixo mais seções editáveis), Linha editorial (banco de pautas mais seções editáveis).
- **Integrações** (no grupo Gestão): Google Agenda por assinatura de link .ics (`/api/agenda?t=<AGENDA_ICS_TOKEN>`, mão única), status do formulário do site e do Instagram. WhatsApp/Evolution: não conectar sem pedido da Ana.
- **Gestão**: CRM (pipeline de sessões e aluguéis), Produtos (ticket, margem e vendas por produto, matriz) e Financeiro (custos e receitas por mês).

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres) · Docker na VPS.

## Como funciona o acesso
- Login com usuário e senha (decisão da Ana em 20/10/2026). Usuárias iniciais, as duas admin: `ana` (Ana Paula) e `sanara` (Sanara, dona do Playroom). O campo de usuário aceita o login ou o nome completo, com ou sem espaço ("Ana Paula", "anapaula"), e ignora maiúsculas e acentos. A senha ignora espaços nas pontas, mas diferencia maiúsculas.
- Usuários ficam em `studio_sm.usuarios`, senha só como hash scrypt (`lib/senha.ts`). Não há tela de cadastro: para criar alguém ou trocar senha, gere o hash com `gerarHash` e grave direto na tabela.
- A sessão é um cookie `sm_sessao` httpOnly, assinado com HMAC usando `SESSION_SECRET`, válido por 30 dias. Trocar o `SESSION_SECRET` desloga todo mundo.
- Toda página chama `exigirLogin()` e toda server action confere `sessao()`. 5 senhas erradas seguidas no mesmo usuário bloqueiam por 15 minutos (em memória, zera ao recriar o container).
- O navegador nunca fala com o Supabase. Toda leitura e escrita passa pelas server actions, que usam a `service_role`.
- As tabelas de `studio_sm` têm RLS ligado e nenhuma policy, então a chave anon não acessa nada.

## Mapa
- `app/page.tsx`: Início. `app/produtos/`: a antiga tela de números (`components/Painel.tsx`). `/painel` redireciona para `/produtos`.
- `app/tarefas`, `app/aplicacoes`, `app/estrategia`, `app/posicionamento`, `app/editorial`, `app/crm`, `app/financeiro`: uma pasta por página, cada uma com seu componente em `components/`.
- `app/login/`: tela e actions de entrar e sair.
- `app/actions.ts`: produtos, seções (`estrategia`, com coluna `pagina`) e tarefas. `app/actions-gestao.ts`: contatos, aplicações, lançamentos e pautas. Cada tabela só aceita os campos da sua lista de permitidos.
- `app/api/aplicacoes/route.ts`: recebe o formulário do site (ver "Aplicações do site").
- `components/Nav.tsx`: menu lateral preto (no celular, botão Menu), aparece só com sessão. `components/Cabecalho.tsx`: cabeçalho e classes de página, cartão e botão.
- `lib/crm.ts`: datas em Brasília e números do pipeline. `lib/prazo.ts`: ordem e rótulo dos prazos. `lib/instagram.ts`: última coleta e a de 7 dias antes.
- `lib/auth.ts`: cookie de sessão assinado. `lib/useAutosave.ts`: salva 700 ms depois da última edição.
- `components/Painel.tsx`: tela de preenchimento. Salva 700 ms após a pessoa parar de digitar.
- `components/Resultados.tsx`: "A levantar", totais, ranking e matriz, usado nas duas páginas.
- `components/Matriz.tsx`: gráfico SVG margem × vendas (log), cortes na mediana. `compacto` é a versão de celular.
- `lib/dados.ts`: colunas, normalização e leitura do painel.
- `lib/calc.ts`: regras de cálculo puras. Lucro = ticket × margem% × vendas.
- `lib/supabase.ts`: cliente `service_role` apontando para o schema `studio_sm`, com `cache: "no-store"`.
- `supabase/migrations/`: 0001 produtos, 0002 estratégia e tarefas, 0003 usuários (sem seed; hashes inseridos à mão), 0004 gestão e marketing, 0005 agenda.
- `scraper/`: coletor do Instagram (Python, Scrapling).

## Regras de negócio
- Contato do CRM em "Realizado" vira receita sozinho (trigger `sincronizar_receita` em `contatos`): categoria Sessões ou Aluguéis, data do atendimento, valor do contato. Saiu de "Realizado", a receita é apagada. Essa receita não pode ser removida pelo Financeiro.
- Lançamento recorrente aparece em todo mês a partir da data dele. Custo recorrente conta como fixo.
- CRM guarda só apelido e um contato. Nada de nome completo, documento ou foto.

## Aplicações do site
O formulário do site (ainda a fazer) envia servidor a servidor: `POST https://sm.testesana.com.br/api/aplicacoes` com `Authorization: Bearer <APLICACOES_TOKEN>` e JSON `{ "apelido", "contato", "interesse", "respostas": [{ "pergunta", "resposta" }] }`. Qualquer outro campo simples vira resposta. Limite de 20 KB. O token não pode ir para o navegador.

## Instagram
`scraper/instagram.py` lê seguidores, seguindo e posts do HTML público do perfil e grava em `studio_sm.instagram`. O perfil é restrito por idade, então curtidas e engajamento não aparecem sem login. Da VPS o Instagram bloqueia (HTTP 429, IP de datacenter); do Mac da Ana funciona. Na VPS há um cron às 12:00 UTC (`docker compose --profile insta run --rm -T insta`, log em `/var/log/studio-sm-insta.log`) que só passa a funcionar com `INSTAGRAM_PROXY` (proxy residencial) no `.env.local`.

## Produção
https://sm.testesana.com.br, com HTTPS, na VPS (`76.13.226.25`), pasta `/opt/apps/studio-sm`, container `studio-sm` em `127.0.0.1:3036`, nginx do sistema na frente. O sm.projetosdaana.com.br foi desligado em 20/10/2026.

Subir ou atualizar: enviar os arquivos por `rsync` e rodar `docker compose up -d --build`. Trocou variável no `.env.local`: `docker compose up -d --force-recreate` (o `restart` mantém o valor antigo).

## Identidade
Fundo claro `#f5f2f1`, cartões brancos, texto preto `#0d0a0a`, vermelho `#c8102e` só como acento. Fonte Inter. Tokens em `tailwind.config.ts`.

## Regras
- Textos da interface em português do Brasil, sem travessões.
- Não expor `SUPABASE_SERVICE_ROLE_KEY` com prefixo `NEXT_PUBLIC_`.
- "Não sei" é um booleano por campo (`ticket_ns`, `margem_ns`, `vendas_ns`), não um valor no número.
