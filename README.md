# Studio - SM

Estratégia do Playroom: números dos produtos (ticket, margem e giro viram lucro mensal, ranking e matriz), estratégia de marca e tarefas do projeto. Acesso com usuário e senha.

## Subir em 4 passos

1. **Supabase**: no projeto único, rode as migrações de `supabase/migrations/` em ordem no SQL Editor. Isso cria o schema `studio_sm`, as tabelas e o conteúdo inicial. O schema precisa estar na lista `pgrst.db_schemas` do role `authenticator`.
2. **Usuários**: gere o hash da senha com `gerarHash` (`lib/senha.ts`) e insira em `studio_sm.usuarios` (`nome`, `login` minúsculo sem acento, `senha_hash`, `admin`).
3. **Variáveis** (copie `.env.example` para `.env.local`, na sua máquina e na VPS):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET` (`openssl rand -hex 32`)
4. **Deploy** na VPS, em `/opt/apps/studio-sm`: `docker compose up -d --build`. Endereço: `https://sm.testesana.com.br`.

## Rodar local

```bash
npm install
npm run dev
# abra http://localhost:3000 e entre com seu usuário
```

## Segurança
Sem sessão válida, toda página manda para `/login` e toda server action recusa. A chave `service_role` fica só no servidor. Trocar `SESSION_SECRET` desloga todo mundo; depois de mudar variável no `.env.local` da VPS, rode `docker compose up -d --force-recreate`.
