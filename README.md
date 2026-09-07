# LUMAX — Site Institucional

## Como abrir
Abra `index.html` num navegador moderno. Para melhor experiência, pode usar um servidor local simples.

## Administração
Abra `admin.html`.

Credenciais de demonstração:
- Utilizador: `admin`
- Palavra-passe: `lumax123`

**Importante:** este login usa `sessionStorage` e não é seguro para produção.

## Conteúdo
O painel usa `localStorage`. Alterações feitas no admin aparecem automaticamente no site no mesmo navegador/dispositivo.

## Imagens
As imagens carregadas são convertidas para Base64 e guardadas no `localStorage`. Isto é adequado apenas para demonstração, pois navegadores possuem limites de armazenamento.

## Personalização
- Logo: substituir o placeholder no `index.html` e colocar o ficheiro em `assets/logo/`.
- Cores: editar as variáveis no início de `css/style.css`.
- Contactos e redes: usar a secção Configurações do `admin.html`.
