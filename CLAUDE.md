# Studio - SM

Sistema de gestão do Playroom (casa de BDSM em Brasília), com menu lateral:
- **Início**: próximas 7 tarefas, números do Instagram e resumo do CRM.
- **Calendário**: sessões e aluguéis do CRM (proposta, agendado, realizado) mais workshops, eventos e outros da tabela `agenda`.
- **Tarefas**: kanban (padrão) ou lista, no visual de cartões arredondados que a Ana mandou; status A fazer, Fazendo, Feito; etiqueta opcional (Não iniciado, Aguardando revisão, Concluído, Publicado); responsável (uma usuária, avatar com iniciais); prazo. A ordem das tarefas sem prazo é a prioridade (coluna `ordem`). **Aplicações** (envios do formulário do site; aprovar cria o contato no CRM).
- **Marketing**: Estratégia (mapa de fluxos do negócio, fixo no código), Posicionamento (arquétipo fixo mais seções editáveis), Linha editorial (banco de pautas mais seções editáveis).
- **Materiais de apoio** (`/materiais`): PDFs, conteúdos, prompts, modelos e links por seção. Arquivos no bucket privado `studio-sm-materiais` (até 50 MB; `bodySizeLimit` no next.config); download por `/api/materiais/<id>`, só com login, via link assinado de 60 s.
- **Admin** (só admin): Usuários e Integrações (`/admin/integracoes`; `/integracoes` redireciona). **Integrações**: Google Agenda por assinatura de link .ics (`/api/agenda?t=<AGENDA_ICS_TOKEN>`, mão única), status do formulário do site e do Instagram. WhatsApp/Evolution: não conectar sem pedido da Ana.
- **Gestão**: CRM (pipeline de sessões e aluguéis), Produtos (nome, descrição e preço; o preço fica na coluna `ticket`, margem e vendas antigas seguem no banco sem aparecer) e Financeiro (receitas, custos fixos e custos variáveis por mês).

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres) · Docker na VPS.

## Como funciona o acesso
- Login com usuário e senha (decisão da Ana em 20/10/2026). Usuárias iniciais, as duas admin: `ana` (Ana Paula) e `sanara` (Sanara, dona do Playroom). O campo de usuário aceita o login ou o nome completo, com ou sem espaço ("Ana Paula", "anapaula"), e ignora maiúsculas e acentos. A senha ignora espaços nas pontas, mas diferencia maiúsculas.
- Usuários ficam em `studio_sm.usuarios`, senha só como hash scrypt (`lib/senha.ts`). Admin gerencia em **Admin › Usuários** (`/admin/usuarios`): criar, renomear, trocar senha, dar ou tirar admin, encerrar logins, remover. Senha nova: mínimo 8 caracteres. Cada pessoa troca a própria senha em **Minha conta** (`/conta`, clicando no nome no rodapé do menu). Precisa sobrar pelo menos um admin; ninguém remove nem tira o admin de si.
- A sessão é um cookie `sm_sessao` httpOnly, assinado com HMAC usando `SESSION_SECRET`, válido por 30 dias, com a `versao` do usuário. `sessao()` (em `lib/auth.ts`) confere no banco a cada requisição: usuário removido ou com versão diferente (senha trocada, logins encerrados) cai na hora. Trocar o `SESSION_SECRET` desloga todo mundo.
- Toda página chama `await exigirLogin()` (ou `exigirAdmin()`) e toda server action confere `await sessao()`. Grupo Admin do menu e `/integracoes` são só para admin. 5 senhas erradas seguidas no mesmo usuário bloqueiam por 15 minutos (em memória, zera ao recriar o container).
- O navegador nunca fala com o Supabase. Toda leitura e escrita passa pelas server actions, que usam a `service_role`.
- As tabelas de `studio_sm` têm RLS ligado e nenhuma policy, então a chave anon não acessa nada.

## Mapa
- `app/page.tsx`: Início. `/painel` redireciona para `/produtos`.
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
- `supabase/migrations/`: 0001 produtos, 0002 estratégia e tarefas, 0003 usuários (sem seed; hashes inseridos à mão), 0004 gestão e marketing, 0005 agenda, 0006 status e etiqueta das tarefas, 0007 versão da sessão, 0008 responsável da tarefa, 0009 materiais de apoio.
- `scraper/`: coletor do Instagram (Python, Scrapling).

## Regras de negócio
- Contato do CRM em "Realizado" vira receita sozinho (trigger `sincronizar_receita` em `contatos`): categoria Sessões ou Aluguéis, data do atendimento, valor do contato. Saiu de "Realizado", a receita é apagada. Essa receita não pode ser removida pelo Financeiro.
- Lançamento recorrente aparece em todo mês a partir da data dele. Custo fixo = custo recorrente; custo variável = só no mês lançado.
- CRM guarda só apelido e um contato. Nada de nome completo, documento ou foto.

## Aplicações do site
O formulário do site (ainda a fazer) envia servidor a servidor: `POST https://gestao.playroombsb.com.br/api/aplicacoes` com `Authorization: Bearer <APLICACOES_TOKEN>` e JSON `{ "apelido", "contato", "interesse", "respostas": [{ "pergunta", "resposta" }] }`. Qualquer outro campo simples vira resposta. Limite de 20 KB. O token não pode ir para o navegador.

## Instagram
`scraper/instagram.py` lê seguidores, seguindo e posts do HTML público do perfil e grava em `studio_sm.instagram`. O perfil é restrito por idade, então curtidas e engajamento não aparecem sem login. Da VPS o Instagram bloqueia (HTTP 429, IP de datacenter); do Mac da Ana funciona. Na VPS há um cron semanal, segunda às 12:00 UTC = 9h de Brasília (`docker compose --profile insta run --rm -T insta`, log em `/var/log/studio-sm-insta.log`) que só passa a funcionar com `INSTAGRAM_PROXY` (proxy residencial) no `.env.local`.

## Produção
https://gestao.playroombsb.com.br, desde 22/10/2026. Infraestrutura própria do Playroom: os acessos dela servem só a este projeto.
- **VPS** Hostinger `2.25.69.237` (chave `~/.ssh/playroom_vps` no Mac da Ana), pasta `/opt/apps/studio-sm`, container `studio-sm` sem porta publicada. O **Traefik** da máquina atende o domínio e emite o HTTPS pelos labels do `docker-compose.yml` (certresolver `letsencrypt`, entrypoint `websecure`).
- **Banco**: projeto Supabase próprio do Playroom, schema `studio_sm` (estrutura das `supabase/migrations`), bucket privado `studio-sm-materiais`. O schema precisa estar em *Exposed schemas* no painel (Settings › API).
- **Firewall** (ufw) ligado: só 22, 80 e 443. Porta publicada por Docker passa por cima do ufw; por isso a 32768 da Evolution (que também roda nessa VPS e não é deste projeto) está bloqueada na chain `DOCKER-USER`, em `/etc/ufw/after.rules` e `after6.rules`.
- Em 22/10/2026 o projeto foi apagado da VPS antiga (`76.13.226.25`), do Supabase da Ana (schema, bucket e histórico de migrações) e do GitHub `anaperci/studio-sm`. Os endereços antigos (`sm.testesana.com.br`, `sm.projetosdaana.com.br`) não abrem nada e saem do DNS. O único lugar com os dados é o banco do Playroom; o código vive em `github.com/playroombsb/gestao`.
- `.env.local` da VPS: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `APLICACOES_TOKEN`, `AGENDA_ICS_TOKEN` (os três últimos novos na migração).

Subir ou atualizar: enviar os arquivos por `rsync` (sem apagar o `.env.local` de lá) e rodar `docker compose up -d --build`. Trocou variável no `.env.local`: `docker compose up -d --force-recreate` (o `restart` mantém o valor antigo).

## Identidade
Fundo claro `#f5f2f1`, cartões brancos, texto preto `#0d0a0a`, vermelho `#c8102e` só como acento, cinza fraco `apagado` (`#756a68`, passa no contraste). Fonte Inter. Tokens em `tailwind.config.ts`.

Padrão visual (decidido em 20/10/2026, a partir da página de Tarefas): peças em `app/globals.css`, use sempre elas.
- Botões `btn-1` (vermelho), `btn-2` (contorno), `btn-3` (texto), `btn-perigo`, `btn-icone`; filtros `pilula` com `aria-pressed`; alternador `segmento`; campos `caixa` (formulário) e `campo` (edição direta); `cartao`; `selo`; `rotulo`; `titulo-secao`.
- Cantos: botões e campos 8px, filtros e setas em pílula, cartões 16px. Sidebar com itens arredondados e gradiente leve.
- Escala: texto 12/13/15, seção 18, título da página 28 a 40. Campos com 16px no celular (o iPhone dá zoom abaixo disso).
- Alturas: 40px no mouse, 44px no toque (variante `toque:`, ponteiro grosso).
- Kanban de Tarefas e CRM: colunas lado a lado só em tela larga; abaixo disso, abas com uma coluna por vez.

## Regras
- Textos da interface em português do Brasil, sem travessões.
- Não expor `SUPABASE_SERVICE_ROLE_KEY` com prefixo `NEXT_PUBLIC_`.
- "Não sei" é um booleano por campo (`ticket_ns`, `margem_ns`, `vendas_ns`), não um valor no número.
