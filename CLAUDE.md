# Studio - SM

Ferramenta de estratégia do Playroom (casa de BDSM em Brasília). Quatro páginas: Números (ticket, margem e vendas por produto, com "não sei"; calcula lucro mensal, ranking, matriz margem × giro e o que falta levantar), Painel (leitura dos números), Estratégia (seções de texto editáveis: arquétipo, posicionamento, cliente ideal) e Tarefas (lista do projeto).

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres) · Docker na VPS.

## Como funciona o acesso
- Login com usuário e senha (decisão da Ana em 20/10/2026). Usuárias iniciais, as duas admin: `ana` (Ana Paula) e `serena` (Serena). O campo de usuário ignora maiúsculas e acentos.
- Usuários ficam em `studio_sm.usuarios`, senha só como hash scrypt (`lib/senha.ts`). Não há tela de cadastro: para criar alguém ou trocar senha, gere o hash com `gerarHash` e grave direto na tabela.
- A sessão é um cookie `sm_sessao` httpOnly, assinado com HMAC usando `SESSION_SECRET`, válido por 30 dias. Trocar o `SESSION_SECRET` desloga todo mundo.
- Toda página chama `exigirLogin()` e toda server action confere `sessao()`. 5 senhas erradas seguidas no mesmo usuário bloqueiam por 15 minutos (em memória, zera ao recriar o container).
- O navegador nunca fala com o Supabase. Toda leitura e escrita passa pelas server actions, que usam a `service_role`.
- As tabelas de `studio_sm` têm RLS ligado e nenhuma policy, então a chave anon não acessa nada.

## Mapa
- `app/page.tsx`: carrega os produtos para preenchimento.
- `app/painel/page.tsx`: painel de leitura, sem nenhum campo editável.
- `app/estrategia/page.tsx` e `components/Estrategia.tsx`: seções de texto editáveis.
- `app/tarefas/page.tsx` e `components/Tarefas.tsx`: lista de tarefas (criar, marcar feita, editar, remover).
- `app/login/`: tela e actions de entrar e sair.
- `app/actions.ts`: listar, salvar, adicionar, remover de produtos, seções e tarefas. Cada tabela só aceita os campos da sua lista de permitidos.
- `components/Nav.tsx`: menu do topo, aparece só com sessão.
- `lib/auth.ts`: cookie de sessão assinado. `lib/useAutosave.ts`: salva 700 ms depois da última edição.
- `components/Painel.tsx`: tela de preenchimento. Salva 700 ms após a pessoa parar de digitar.
- `components/Resultados.tsx`: "A levantar", totais, ranking e matriz, usado nas duas páginas.
- `components/Matriz.tsx`: gráfico SVG margem × vendas (log), cortes na mediana. `compacto` é a versão de celular.
- `lib/dados.ts`: colunas, normalização e leitura do painel.
- `lib/calc.ts`: regras de cálculo puras. Lucro = ticket × margem% × vendas.
- `lib/supabase.ts`: cliente `service_role` apontando para o schema `studio_sm`, com `cache: "no-store"`.
- `supabase/migrations/`: 0001 produtos, 0002 estratégia e tarefas, 0003 usuários (sem seed; hashes inseridos à mão).

## Produção
https://sm.testesana.com.br, com HTTPS, na VPS (`76.13.226.25`), pasta `/opt/apps/studio-sm`, container `studio-sm` em `127.0.0.1:3036`, nginx do sistema na frente. O sm.projetosdaana.com.br foi desligado em 20/10/2026.

Subir ou atualizar: enviar os arquivos por `rsync` e rodar `docker compose up -d --build`. Trocou variável no `.env.local`: `docker compose up -d --force-recreate` (o `restart` mantém o valor antigo).

## Identidade
Fundo claro `#f5f2f1`, cartões brancos, texto preto `#0d0a0a`, vermelho `#c8102e` só como acento. Fonte Inter. Tokens em `tailwind.config.ts`.

## Regras
- Textos da interface em português do Brasil, sem travessões.
- Não expor `SUPABASE_SERVICE_ROLE_KEY` com prefixo `NEXT_PUBLIC_`.
- "Não sei" é um booleano por campo (`ticket_ns`, `margem_ns`, `vendas_ns`), não um valor no número.
