# Catalogo SaaS

Aplicacao full-stack multi-tenant para gestao de catalogo, estoque e vendas, com foco em produtividade para pequenos e medios negocios.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3-6DB33F)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-17-orange)](https://adoptium.net/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-Private-lightgrey)](#)

## Sumario

- [Visao Geral](#visao-geral)
- [Principais Features](#principais-features)
- [Arquitetura](#arquitetura)
- [Tech Stack](#tech-stack)
- [Comecando Rapido](#comecando-rapido)
- [Execucao Local](#execucao-local)
- [Scripts Uteis](#scripts-uteis)
- [Configuracao de Ambiente](#configuracao-de-ambiente)
- [Deploy Producao](#deploy-producao)
- [API Principal](#api-principal)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Roadmap](#roadmap)

## Visao Geral

O Catalogo SaaS centraliza o fluxo comercial:

- Cadastro de produtos, categorias e clientes.
- Controle de estoque com historico de movimentacoes.
- Registro de vendas com deducao de estoque.
- Login com UX otimizada, onboarding inicial e perfil de usuario.
- Isolamento de dados por tenant (multi-tenant).

## Principais Features

### Autenticacao e Conta

- Cadastro, login, logout e recuperacao de senha.
- Perfil de usuario com edicao de dados e alteracao de senha.
- Mensagens guiadas no login para acelerar conversao.
- Opcao de lembrar e-mail no login.
- Mostrar/ocultar senha no campo de senha.

### Onboarding e UX

- Assistente inicial de configuracao para primeiros passos.
- Banner no painel para continuar onboarding pendente.
- Rotas protegidas por proxy middleware no frontend.

### Catalogo e Operacao

- CRUD de produtos, categorias e clientes.
- Operacoes de estoque: adicionar, ajustar e registrar venda.
- Historico de operacoes de estoque.
- Catalogo publico por tenant.

## Arquitetura

```text
Frontend (Next.js) -> Backend API (Spring Boot) -> PostgreSQL
                              |
                              -> Redis (rate limit e suporte auth)
```

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Vitest + Testing Library
- Playwright (E2E)

### Backend

- Java 17
- Spring Boot 3
- Spring Security + JWT
- Flyway
- Maven

### Infra

- Docker / Docker Compose
- PostgreSQL
- Redis
- Caddy (stack de producao)

## Comecando Rapido

Se voce quer rodar tudo com Docker (recomendado para iniciar rapido):

```bash
docker compose up -d --build
```

Servicos esperados:

- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- Health backend: http://localhost:8080/api/public/health

## Execucao Local

### 1) Frontend

```bash
npm install
npm run dev
```

### 2) Backend

```bash
mvn -f backend/pom.xml spring-boot:run
```

### 3) Banco

Crie o banco local:

```sql
CREATE DATABASE catalogo_db;
```

## Scripts Uteis

### Frontend

```bash
npm run dev
npm run build
npm run start
npm run test:run
npm run test:e2e
```

### Backend

```bash
mvn -f backend/pom.xml test
mvn -f backend/pom.xml clean package -DskipTests
```

## Configuracao de Ambiente

### Frontend

1. Copie `.env.example` para `.env.local`.
2. Ajuste valores se necessario.

### Backend

1. Use `backend/.env.example` como base.
2. Configure variaveis no shell, IDE ou compose.

Importante: nunca use segredos padrao em producao.

## Deploy Producao

### Stack recomendada

- Linux VPS (Ubuntu 22.04/24.04)
- 2 vCPU, 4 GB RAM
- Portas 80 e 443 abertas

### Subida segura (HTTPS)

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Validacao

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
```

## API Principal

### Auth

- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET `/api/auth/profile`
- PUT `/api/auth/profile`
- POST `/api/auth/password/change`

### Produtos

- GET `/api/products`
- POST `/api/products`
- PUT `/api/products/{id}`
- DELETE `/api/products/{id}`

### Categorias

- GET `/api/categories`
- POST `/api/categories`
- PUT `/api/categories/{id}`
- DELETE `/api/categories/{id}`

### Clientes

- GET `/api/customers`
- POST `/api/customers`
- PUT `/api/customers/{id}`
- DELETE `/api/customers/{id}`

### Estoque

- GET `/api/inventory/history`
- POST `/api/inventory/{productId}/add`
- POST `/api/inventory/{productId}/set`
- POST `/api/inventory/{productId}/sale`

## Estrutura de Pastas

```text
.
|- src/
|  |- app/
|  |- components/
|  |- hooks/
|  |- services/
|  |- lib/
|- backend/
|  |- src/main/java/com/catalogo/api/
|  |  |- controller/
|  |  |- service/
|  |  |- repository/
|  |  |- security/
|  |  |- model/
|  |- src/main/resources/
|- docker-compose.yml
|- docker-compose.prod.yml
```

## VS Code + Java (Lombok)

Para evitar falso positivo de editor no backend com Lombok:

1. Instale as extensoes Java e Lombok no VS Code.
2. Garanta Java 17 no language server.
3. Recarregue o workspace apos abrir `backend/pom.xml`.

Comando fonte de verdade:

```bash
mvn -f backend/pom.xml test
```

## Roadmap

- [x] Auth + perfil + alteracao de senha
- [x] CRUD principal (produtos/categorias/clientes)
- [x] Operacoes de estoque e historico
- [x] Onboarding inicial
- [ ] Importacao em lote (CSV)
- [ ] Dashboard com KPIs de conversao e giro
- [ ] Notificacoes de estoque critico

## Contribuicao

Projeto privado. Se voce faz parte do time:

1. Crie branch por feature.
2. Rode testes antes do push.
3. Abra PR com contexto e impacto.
