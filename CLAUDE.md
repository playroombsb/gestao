# Studio - SM

Ferramenta de estratégia de produtos para o Playroom (casa de BDSM em Brasília). A dona preenche, para cada produto ou serviço, ticket médio, margem e vendas por mês (ou marca "não sei"). A página calcula lucro mensal, ranking, matriz margem × giro e a lista do que falta levantar.

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres) · Vercel.

## Como funciona o acesso
- Ninguém precisa de conta. Quem tem o link `/?k=<ACCESS_KEY>` vê e edita.
- O navegador nunca fala com o Supabase. Toda leitura e escrita passa pelas server actions em `app/actions.ts`, que conferem a chave e usam a `service_role`.
- A tabela `studio_sm.produtos` (schema próprio no projeto único do Supabase) tem RLS ligado e nenhuma policy, então a chave anon não acessa nada.
- Para cortar o acesso de alguém: troque `ACCESS_KEY` na Vercel e mande o link novo.

## Mapa
- `app/page.tsx`: valida a chave e carrega os produtos.
- `app/actions.ts`: listar, salvar, adicionar, remover. Só aceita campos da lista `PERMITIDOS`.
- `components/Painel.tsx`: tela inteira (preenchimento, "A levantar", totais, ranking, matriz). Salva 700 ms após a pessoa parar de digitar.
- `components/Matriz.tsx`: gráfico SVG margem × vendas (log), cortes na mediana.
- `lib/calc.ts`: regras de cálculo puras. Lucro = ticket × margem% × vendas.
- `lib/supabase.ts`: cliente `service_role` apontando para o schema `studio_sm`, com `cache: "no-store"`.
- `supabase/migrations/0001_produtos.sql`: schema, tabela e os 10 produtos iniciais.

## Produção
https://sm.testesana.com.br (Vercel).

## Identidade
Fundo claro `#f5f2f1`, cartões brancos, texto preto `#0d0a0a`, vermelho `#c8102e` só como acento. Fonte Inter. Tokens em `tailwind.config.ts`.

## Regras
- Textos da interface em português do Brasil, sem travessões.
- Não expor `SUPABASE_SERVICE_ROLE_KEY` com prefixo `NEXT_PUBLIC_`.
- "Não sei" é um booleano por campo (`ticket_ns`, `margem_ns`, `vendas_ns`), não um valor no número.
