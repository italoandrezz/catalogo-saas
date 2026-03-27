# Checklist de Regressao Funcional

## 1) Autenticacao

- [ ] Login com credenciais validas redireciona para Produtos.
- [ ] Login com senha invalida exibe erro amigavel.
- [ ] Logout remove sessao e retorna para Login.
- [ ] Acesso direto a rota protegida sem login redireciona para /login.

## 2) Dashboard

- [ ] Dashboard carrega sem erro de API.
- [ ] Cards principais exibem contagens coerentes com os dados cadastrados.

## 3) Categorias

- [ ] Criar categoria com apenas nome funciona.
- [ ] Buscar categoria por nome retorna item correto.
- [ ] Editar categoria persiste alteracoes na tabela.
- [ ] Excluir categoria remove item da listagem.

## 4) Clientes

- [ ] Criar cliente com nome, email e telefone funciona.
- [ ] Editar cliente atualiza dados exibidos.
- [ ] Excluir cliente remove item da listagem.

## 5) Produtos

- [ ] Criar produto com nome, preco e categoria funciona.
- [ ] Criar produto sem imagens funciona.
- [ ] Editar produto atualiza nome/preco na listagem.
- [ ] Alternar ativo/inativo funciona e atualiza botao de estado.
- [ ] Excluir produto remove item da listagem.

## 6) Estoque

- [ ] Pagina de estoque abre sem alertas de erro.
- [ ] Busca por produto encontra o card correto.
- [ ] Acao Adicionar soma quantidade e exibe feedback de sucesso.
- [ ] Acao Ajustar define valor exato e exibe feedback.
- [ ] Acao Venda deduz estoque quando quantidade e valida.
- [ ] Venda bloqueia envio quando quantidade excede estoque.

## 7) Historico de Operacoes

- [ ] Cards de vendas/entradas/ajustes exibem valores.
- [ ] Filtro Todos/Entradas/Ajustes/Vendas funciona.
- [ ] Tela trata estado vazio (sem operacoes) sem erro visual.

## 8) Catalogo Publico

- [ ] Catalogo publico abre sem autenticacao.
- [ ] Somente produtos ativos e com estoque > 0 sao exibidos.
- [ ] Imagens do catalogo carregam sem erro 404.

## 9) Seguranca / CSRF

- [ ] Primeira operacao POST apos login nao falha por CSRF.
- [ ] Cookies de autenticacao e XSRF sao enviados corretamente.

## 10) Upload

- [ ] Upload de imagem valida tipo e tamanho.
- [ ] URL retornada de upload e renderizada no produto.

## 11) Regressao rapida (pre-deploy)

- [ ] Unitarios frontend: `npm run test -- --run`
- [ ] Unitarios backend: `mvn -f backend/pom.xml test`
- [ ] E2E: `npx playwright test`
