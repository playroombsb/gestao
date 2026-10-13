# Studio - SM

Ferramenta de estratégia de produtos para o Playroom (casa de BDSM em Brasília). A dona preenche, para cada produto ou serviço, ticket médio, margem e vendas por mês (ou marca "não sei"). A página calcula lucro mensal, ranking, matriz margem × giro e a lista do que falta levantar.

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres) · Docker na VPS.

## Como funciona o acesso
- Ninguém precisa de conta. Quem tem o link `/?k=<ACCESS_KEY>` vê e edita.
- O navegador nunca fala com o Supabase. Toda leitura e escrita passa pelas server actions em `app/actions.ts`, que conferem a chave e usam a `service_role`.
- A tabela `studio_sm.produtos` (schema próprio no projeto único do Supabase) tem RLS ligado e nenhuma policy, então a chave anon não acessa nada.
- `/painel?k=<chave>` é o painel só de leitura (respostas por produto, totais, ranking, matriz), atualiza a cada 30 s. Abre com a `ACCESS_KEY` ou com a `PAINEL_KEY`; a `PAINEL_KEY` não abre o preenchimento.
- Para cortar o acesso de alguém: troque `ACCESS_KEY` no `.env.local` da VPS, recrie o container e mande o link novo.

## Mapa
- `app/page.tsx`: valida a chave e carrega os produtos.
- `app/painel/page.tsx`: painel de leitura, sem nenhum campo editável.
- `app/actions.ts`: listar, salvar, adicionar, remover. Só aceita campos da lista `PERMITIDOS`.
- `components/Painel.tsx`: tela de preenchimento. Salva 700 ms após a pessoa parar de digitar.
- `components/Resultados.tsx`: "A levantar", totais, ranking e matriz, usado nas duas páginas.
- `components/Matriz.tsx`: gráfico SVG margem × vendas (log), cortes na mediana. `compacto` é a versão de celular.
- `lib/dados.ts`: colunas, normalização e leitura do painel.
- `lib/calc.ts`: regras de cálculo puras. Lucro = ticket × margem% × vendas.
- `lib/supabase.ts`: cliente `service_role` apontando para o schema `studio_sm`, com `cache: "no-store"`.
- `supabase/migrations/0001_produtos.sql`: schema, tabela e os 10 produtos iniciais.

## Produção
https://sm.projetosdaana.com.br (provisório, com HTTPS) e https://sm.testesana.com.br (definitivo, aguardando DNS), na VPS (`76.13.226.25`), pasta `/opt/apps/studio-sm`, container `studio-sm` em `127.0.0.1:3036`, nginx do sistema na frente.

Subir ou atualizar: enviar os arquivos por `rsync` e rodar `docker compose up -d --build`. Trocou variável no `.env.local`: `docker compose up -d --force-recreate` (o `restart` mantém o valor antigo).

## Identidade
Fundo claro `#f5f2f1`, cartões brancos, texto preto `#0d0a0a`, vermelho `#c8102e` só como acento. Fonte Inter. Tokens em `tailwind.config.ts`.

## Regras
- Textos da interface em português do Brasil, sem travessões.
- Não expor `SUPABASE_SERVICE_ROLE_KEY` com prefixo `NEXT_PUBLIC_`.
- "Não sei" é um booleano por campo (`ticket_ns`, `margem_ns`, `vendas_ns`), não um valor no número.
