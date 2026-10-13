# Studio - SM

Mix de produtos do Playroom: ticket médio, margem e giro viram lucro mensal, ranking e matriz de decisão. Preenchimento por link, sem login.

## Subir em 4 passos

1. **Supabase**: no projeto único, rode `supabase/migrations/0001_produtos.sql` no SQL Editor. Isso cria o schema `studio_sm`, a tabela e os 10 produtos. O schema precisa estar na lista `pgrst.db_schemas` do role `authenticator`.
2. **Chave do link**: gere uma chave longa, por exemplo `openssl rand -hex 16`.
3. **Variáveis** (copie `.env.example` para `.env.local`, na sua máquina e na VPS):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ACCESS_KEY`
   - `PAINEL_KEY` (opcional, link só de leitura do painel)
4. **Deploy** na VPS, em `/opt/apps/studio-sm`: `docker compose up -d --build`. O link para a dona é:
   `https://sm.testesana.com.br/?k=SUA_ACCESS_KEY`
   E o painel só de leitura: `https://sm.testesana.com.br/painel?k=SUA_PAINEL_KEY`

## Rodar local

```bash
npm install
npm run dev
# abra http://localhost:3000/?k=SUA_ACCESS_KEY
```

## Segurança
Quem tem o link edita. Para revogar, troque `ACCESS_KEY` no `.env.local` da VPS e rode `docker compose up -d --force-recreate`. A chave `service_role` fica só no servidor.
