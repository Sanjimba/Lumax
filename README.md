# LUMAX — Site institucional e administração

A Lumax é uma aplicação Node.js/Express: o site público lê o conteúdo da API e a área reservada grava os dados no servidor. O ficheiro `data.json` é criado automaticamente no primeiro arranque; as imagens são guardadas em `uploads/`.

## Executar localmente

```bash
npm install
export JWT_SECRET="$(openssl rand -hex 32)"
npm start
```

Abra `http://localhost:3000/admin.html`. No primeiro acesso, a página apresenta o formulário **Criar conta de administrador**. A palavra-passe (mínimo 12 caracteres) é transformada em hash bcrypt no servidor antes de ser guardada na base de dados. Não existem credenciais predefinidas nem é necessário configurar utilizador/password no Render.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `JWT_SECRET` | Sim | Segredo longo e aleatório para assinar sessões JWT. O blueprint do Render gera-o automaticamente. |
| `NODE_ENV` | Recomendado | Defina como `production` em produção para cookies `secure`. |
| `PORT` | Não | Porta HTTP; o Render define-a automaticamente. |

## Deploy no Render

O `render.yaml` cria um **Web Service** Node.js e gera `JWT_SECRET`. Depois do deploy, abra `/admin.html` e crie a primeira conta. Para preservar contas, conteúdos e imagens entre reinícios/deploys, associe um Persistent Disk ao serviço, pois a base de dados é um ficheiro local.

## Acesso e recuperação

Após autenticação existe a opção **Alterar palavra-passe** no menu. Se perder o acesso, use **Esqueceu-se da palavra-passe?** na página de login: informe o utilizador e consulte os logs do serviço no Render. O servidor escreve um código temporário, válido por 15 minutos, que permite definir uma nova palavra-passe. O endpoint devolve a mesma mensagem quer o utilizador exista ou não.

Todas as rotas `/api/*` devolvem JSON, incluindo pedidos inválidos, rotas desconhecidas e erros inesperados. O frontend confirma o estado HTTP e o `content-type` antes de interpretar respostas JSON, apresentando mensagens amigáveis ao utilizador.

Depois de iniciar sessão, **Configurações → Importar dados do navegador antigo** recupera conteúdos do `localStorage` no servidor. Execute-o apenas uma vez no navegador/perfil que continha os dados antigos; imagens Base64 antigas são convertidas para ficheiros enviados ao servidor.

## Estrutura e segurança

Os ficheiros enviados ao browser vivem em `public/` (`index.html`, `admin.html`, `css/`, `js/`, logótipo, `robots.txt` e `sitemap.xml`). O Express serve exclusivamente essa pasta; `data.json`, `uploads/`, código do servidor, configuração de deploy e `.env` ficam fora dela. As imagens carregadas são expostas apenas pela rota explícita `/uploads`.

A criação inicial do administrador só é possível enquanto não existir nenhuma conta. **Assim que fizer o deploy, abra `/admin.html` e crie a conta antes de divulgar o site.** A criação fica registada nos logs do serviço para auditoria. Os pedidos de setup, login e recuperação têm um limite de cinco tentativas por IP em cada janela de 10 minutos.

No Render, configure obrigatoriamente um **Persistent Disk** montado no diretório da aplicação (ou numa localização configurada para os dados) antes de depender do serviço em produção. Sem armazenamento persistente, `data.json` e `uploads/` podem ser perdidos num novo deploy ou reinício.
