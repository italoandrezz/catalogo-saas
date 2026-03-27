# Catalog SaaS

Catalog SaaS is a full-stack multi-tenant catalog management application.

## Tech Stack

- Frontend: Next.js 16, TypeScript, Tailwind CSS
- Backend: Java 17, Spring Boot 3, Spring Security, JWT
- Database: PostgreSQL

## Features

- Authentication with register and login
- JWT-based API security
- Multi-tenant data isolation by tenant
- Full CRUD for products, categories and customers
- Protected frontend routes with middleware
- Clean Code modular structure (services, hooks, reusable forms)

## Project Structure

- frontend (this workspace root)
  - src/app: routes and pages
  - src/services: API service layer
  - src/hooks: UI state/action hooks
  - src/components: reusable UI, forms and layouts
- backend
  - src/main/java/com/catalogo/api
    - controller: REST endpoints
    - service: business rules
    - repository: persistence layer
    - model: entities and DTOs
    - security: JWT and auth filters
    - exception: global error handling
  - src/main/resources: backend configuration

## Requirements

- Node.js 20+
- Java 17+
- Maven 3.9+
- PostgreSQL 14+

## VS Code Java Setup (Lombok)

To avoid false editor diagnostics in the backend (especially Lombok-generated methods), use this setup in VS Code:

1. Install extensions:
  - `Language Support for Java(TM) by Red Hat`
  - `Lombok Annotations Support for VS Code`
2. Ensure VS Code is using Java 17 for the Java language server.
3. Reload the Java workspace after opening `backend/pom.xml`.

Validation command (source of truth):

```bash
mvn -f backend/pom.xml test
```

If this command passes, backend compile/test state is healthy even when the editor still shows stale Lombok diagnostics.

## Environment Configuration

### Frontend

1. Copy [.env.example](.env.example) to `.env.local`
2. Adjust values if needed

### Backend

1. Copy [backend/.env.example](backend/.env.example)
2. Export environment variables in your shell or IDE run configuration

Important: Do not use default secrets in production.

## Database Setup

1. Create database:

```sql
CREATE DATABASE catalogo_db;
```

2. Ensure PostgreSQL credentials match backend env vars.

## Run Locally

### 1. Start backend

```bash
mvn -f backend/pom.xml spring-boot:run
```

Backend API: http://localhost:8080

### 2. Start frontend

```bash
npm install
npm run dev
```

Frontend app: http://localhost:3000

## Build

### Frontend

```bash
npm run build
```

### Backend

```bash
mvn -f backend/pom.xml clean package -DskipTests
```

## Production (Secure Compose)

1. Copy [.env.example](.env.example) to `.env` and define secure values for:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `APP_DOMAIN`
- `ACME_EMAIL`

2. Start production stack with HTTPS reverse proxy:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Production Deploy Guide

Recommended target for this project size: a Linux VPS with Docker Engine and Docker Compose plugin.

### 1. Prepare the server

- Ubuntu 22.04 or 24.04
- 2 vCPU
- 4 GB RAM
- 40 to 80 GB SSD
- Open ports `80`, `443` and optionally `22` for SSH

### 2. Point your domain

- Create an `A` record for your domain or subdomain pointing to the VPS public IP
- Wait for DNS propagation before requesting HTTPS certificates

### 3. Install Docker on the VPS

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out and back in after changing the Docker group.

### 4. Upload the project

```bash
git clone <SEU_REPOSITORIO>
cd catologo-project
```

### 5. Create the production environment file

```bash
cp .env.example .env
```

Then edit `.env` with real production values:

- `POSTGRES_PASSWORD`: strong database password
- `JWT_SECRET`: secret with at least 32 random characters
- `APP_DOMAIN`: real public domain, for example `catalogo.seudominio.com`
- `ACME_EMAIL`: e-mail used by Let's Encrypt
- `CORS_ALLOWED_ORIGINS`: not required in the production override, because it is injected automatically from `APP_DOMAIN`

### 6. Start production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 7. Validate the deployment

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
```

Expected result:

- Only Caddy is publicly exposed on ports `80` and `443`
- Frontend, backend, Postgres and Redis stay internal to the Docker network
- HTTPS certificates are issued automatically by Let's Encrypt

### 8. Update after changes

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 9. Backup recommendation

- Back up the Docker volume used by PostgreSQL
- Back up the uploads volume
- Keep a copy of the `.env` file in a secure password manager or secrets vault

Notes:

- PostgreSQL is not exposed publicly in production override.
- Caddy terminates HTTPS on ports 80/443 and proxies `/api` and `/uploads` to backend.
- `CORS_ALLOWED_ORIGINS` is set to `https://${APP_DOMAIN}` in production override.

## API Endpoints

### Auth

- POST `/api/auth/register`
- POST `/api/auth/login`

### Products

- GET `/api/products`
- GET `/api/products/{id}`
- POST `/api/products`
- PUT `/api/products/{id}`
- DELETE `/api/products/{id}`

### Categories

- GET `/api/categories`
- POST `/api/categories`
- PUT `/api/categories/{id}`
- DELETE `/api/categories/{id}`

### Customers

- GET `/api/customers`
- POST `/api/customers`
- PUT `/api/customers/{id}`
- DELETE `/api/customers/{id}`

## Production Hardening Checklist

- Replace JWT secret and DB credentials with secure values
- Configure CORS allowed origins for real domains
- Set `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` and use migrations (Flyway/Liquibase)
- Add automated test suites (unit + integration + e2e)
- Add observability (logs, metrics, health checks)
- Add CI/CD pipeline and containerization
