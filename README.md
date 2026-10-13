# Studio - SM

Mix de produtos do Playroom: ticket médio, margem e giro viram lucro mensal, ranking e matriz de decisão. Preenchimento por link, sem login.

## Subir em 4 passos

1. **Supabase**: no projeto único, rode `supabase/migrations/0001_produtos.sql` no SQL Editor. Isso cria o schema `studio_sm`, a tabela e os 10 produtos. O schema precisa estar na lista `pgrst.db_schemas` do role `authenticator`.
2. **Chave do link**: gere uma chave longa, por exemplo `openssl rand -hex 16`.
3. **Variáveis** (copie `.env.example` para `.env.local` e preencha também na Vercel):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ACCESS_KEY`
4. **Deploy** na Vercel. O link para a dona é:
   `https://seu-dominio.vercel.app/?k=SUA_ACCESS_KEY`

## Rodar local

```bash
npm install
npm run dev
# abra http://localhost:3000/?k=SUA_ACCESS_KEY
```

## Segurança
Quem tem o link edita. Para revogar, troque `ACCESS_KEY` na Vercel e faça redeploy. A chave `service_role` fica só no servidor.
