# LUMAX — Site institucional e administração

A Lumax é uma aplicação Node.js/Express: o site público lê o conteúdo da API e a área reservada grava os dados no servidor. O ficheiro `data.json` é criado automaticamente no primeiro arranque; as imagens são guardadas em `uploads/`.

> **⚠️ Obrigatório no Render: configure `JWT_SECRET`.** Sem esta variável o servidor interrompe o arranque com `JWT_SECRET is required...`; por isso, todos os pedidos da API falham no browser. O `render.yaml` gera o valor automaticamente **apenas** quando o deploy é criado via **Blueprint**. Se criar o Web Service manualmente no dashboard do Render, defina um segredo longo e aleatório em **Environment** antes de fazer o deploy.

> **⚠️ Segurança: a conta de demonstração é uma credencial pública.** Altere a respetiva palavra-passe em **Alterar palavra-passe** ou remova a conta antes de o site ser usado por clientes reais.

## Executar localmente

```bash
npm install
export JWT_SECRET="$(openssl rand -hex 32)"
npm start
```

Abra `http://localhost:3000/admin.html` e entre com a conta criada automaticamente no primeiro arranque:

- **Utilizador:** `admin`
- **Palavra-passe:** `LumaxDemo2026!`

A palavra-passe é transformada em hash bcrypt no servidor antes de ser guardada na base de dados. Altere-a logo após entrar.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `JWT_SECRET` | **Sim** | Segredo longo e aleatório para assinar sessões JWT. No Render manual, configure-o em **Environment**; só o Blueprint o gera automaticamente. |
| `DEMO_ADMIN_USER` | Não | Utilizador da conta automática criada apenas se não existirem administradores. Predefinição: `admin`. |
| `DEMO_ADMIN_PASSWORD` | Não | Palavra-passe da conta automática criada apenas se não existirem administradores. Predefinição: `LumaxDemo2026!`. |
| `NODE_ENV` | Recomendado | Defina como `production` em produção para cookies `secure`. |
| `PORT` | Não | Porta HTTP; o Render define-a automaticamente. |

## Deploy no Render

O `render.yaml` cria um **Web Service** Node.js e gera `JWT_SECRET` quando usado como Blueprint. Num serviço criado manualmente, configure `JWT_SECRET` em **Environment** — sem ele, o servidor não inicia. Depois do deploy, abra `/admin.html` e use a conta de demonstração acima; mude ou remova essa credencial antes de disponibilizar o site a clientes.

Para preservar contas, conteúdos e imagens entre reinícios/deploys, associe um Persistent Disk ao serviço, pois a base de dados é um ficheiro local.

## Acesso e recuperação

Após autenticação existe a opção **Alterar palavra-passe** no menu. Se perder o acesso, use **Esqueceu-se da palavra-passe?** na página de login: informe o utilizador e consulte os logs do serviço no Render. O servidor escreve um código temporário, válido por 15 minutos, que permite definir uma nova palavra-passe. O endpoint devolve a mesma mensagem quer o utilizador exista ou não.

Todas as rotas `/api/*` devolvem JSON, incluindo pedidos inválidos, rotas desconhecidas e erros inesperados. O frontend confirma o estado HTTP e o `content-type` antes de interpretar respostas JSON, apresentando mensagens amigáveis ao utilizador. Se o serviço estiver a arrancar ou não responder, a página de login apresenta um botão **Tentar novamente**, sem exigir recarregar a página.

Depois de iniciar sessão, **Configurações → Importar dados do navegador antigo** recupera conteúdos do `localStorage` no servidor. Execute-o apenas uma vez no navegador/perfil que continha os dados antigos; imagens Base64 antigas são convertidas para ficheiros enviados ao servidor.

## Estrutura e segurança

Os ficheiros enviados ao browser vivem em `public/` (`index.html`, `admin.html`, `css/`, `js/`, logótipo, `robots.txt` e `sitemap.xml`). O Express serve exclusivamente essa pasta; `data.json`, `uploads/`, código do servidor, configuração de deploy e `.env` ficam fora dela. As imagens carregadas são expostas apenas pela rota explícita `/uploads`.

A criação inicial do administrador só é possível enquanto não existir nenhuma conta. Os pedidos de setup, login e recuperação têm um limite de cinco tentativas por IP em cada janela de 10 minutos.

No Render, configure obrigatoriamente um **Persistent Disk** montado no diretório da aplicação (ou numa localização configurada para os dados) antes de depender do serviço em produção. Sem armazenamento persistente, `data.json` e `uploads/` podem ser perdidos num novo deploy ou reinício.
