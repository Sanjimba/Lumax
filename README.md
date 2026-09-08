# LUMAX — Site institucional e administração

A Lumax é agora uma aplicação Node.js/Express: o site público lê o conteúdo da API e a área reservada grava os dados no servidor. O ficheiro `data.json` é criado automaticamente no primeiro arranque; as imagens são guardadas em `uploads/`, nunca em Base64 no navegador.

## Executar localmente

```bash
npm install
export ADMIN_USER="o-seu-utilizador"
export ADMIN_PASSWORD_HASH="$(node -e "const b=require('bcryptjs'); b.hash(process.argv[1],12).then(console.log)" 'uma-password-segura')"
export JWT_SECRET="$(openssl rand -hex 32)"
npm start
```

Abra `http://localhost:3000` e use `http://localhost:3000/admin.html` para administrar o conteúdo. Não existem credenciais predefinidas: o login só funciona depois de configurar as variáveis acima.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `ADMIN_USER` | Sim | Nome de utilizador do administrador. |
| `ADMIN_PASSWORD_HASH` | Sim | Hash bcrypt da palavra-passe, nunca a palavra-passe em texto. |
| `JWT_SECRET` | Sim | Segredo longo e aleatório para assinar sessões JWT. |
| `NODE_ENV` | Recomendado | Defina como `production` em produção para cookies `secure`. |
| `PORT` | Não | Porta HTTP; o Render define-a automaticamente. |

## Deploy no Render

O repositório inclui `render.yaml` para criar um **Web Service** Node.js, e não um Static Site. Antes do primeiro deploy, no painel do Render, defina `ADMIN_USER` e `ADMIN_PASSWORD_HASH` (gere o hash com o comando acima). O `JWT_SECRET` pode ser gerado pelo Render conforme o blueprint. Para persistência entre deploys/reinícios, associe um Persistent Disk e configure o serviço para o diretório da aplicação, pois a base de dados é um ficheiro local.

## API

As rotas `GET /api/settings`, `GET /api/trust_steps`, `GET /api/services`, `GET /api/properties`, `GET /api/posts`, `GET /api/gallery` e `GET /api/faq` são públicas. As operações de escrita usam `POST`, `PUT` e `DELETE` nas mesmas coleções e requerem sessão autenticada. O login usa cookie httpOnly com JWT, e o logout invalida a sessão guardada no servidor.

## Recuperar ou alterar o acesso de administrador

Nunca há uma palavra-passe predefinida nem ela é mostrada no site. Se `ADMIN_USER` ou `ADMIN_PASSWORD_HASH` não estiverem configuradas, o servidor mantém o site público ativo, recusa o login com uma mensagem objetiva e escreve nos logs do Render a instrução de configuração.

### Localmente

Execute `npm run create-admin`, indique o utilizador e uma palavra-passe com pelo menos 12 caracteres. O script cria/atualiza `.env` (com permissões privadas), gera o hash bcrypt e também cria `JWT_SECRET` se ainda não existir. O `.env` é ignorado pelo Git. Reinicie `npm start` depois de alterar as credenciais.

### No Render

1. Abra o serviço **lumax** no Render e escolha **Environment**.
2. Crie ou altere `ADMIN_USER` com o nome de utilizador desejado.
3. Gere um hash bcrypt localmente sem revelar a palavra-passe: `node -e "require('bcryptjs').hash(process.argv[1], 12).then(console.log)" 'uma-password-segura'`.
4. Cole apenas o resultado em `ADMIN_PASSWORD_HASH`; defina também `JWT_SECRET` como uma sequência aleatória longa (por exemplo, `openssl rand -hex 32`).
5. Guarde as variáveis e faça **Manual Deploy → Deploy latest commit**. Para trocar a password, repita os passos 3 a 5.

As variáveis têm exatamente estes nomes: `ADMIN_USER`, `ADMIN_PASSWORD_HASH` e `JWT_SECRET`. Não coloque a password em texto simples no Render, no repositório ou na página de login.

Depois de iniciar sessão, **Configurações → Importar dados do navegador antigo** recupera `lumax_properties`, `lumax_gallery` e os restantes conteúdos do `localStorage` no servidor. Execute-o apenas uma vez, no navegador/perfil que continha os dados antigos; as imagens Base64 antigas são convertidas para ficheiros enviados ao servidor.
