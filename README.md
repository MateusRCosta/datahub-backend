# Backend

API NestJS do projeto Datahub, usando Prisma e PostgreSQL.

## Requisitos

- Node.js 24 ou superior.
- PostgreSQL acessível pela variável `DATABASE_URL`.
- Arquivo `.env` configurado.

Para preparar as variáveis locais:

```bash
cp .env.example .env
```

## Instalação

```bash
npm install
```

## Rodar localmente

Modo desenvolvimento:

```bash
npm run start:dev
```

Modo produção, depois do build:

```bash
npm run build
npm run start:prod
```

A API usa a porta configurada em `PORT`. No ambiente padrão do projeto, ela roda em `http://localhost:8000`.

## Prisma

Gerar o Prisma Client:

```bash
npx prisma generate
```

Criar/aplicar migration em desenvolvimento:

```bash
npx prisma migrate dev
```

Aplicar migrations em ambiente de execução:

```bash
npx prisma migrate deploy
```

Executar seeds:

```bash
npx prisma db seed
```

## Testes

```bash
npm run test
npm run test:e2e
npm run test:cov
```

## Docker

Para rodar o ambiente completo com PostgreSQL, migrations e backend, use o Docker Compose na raiz do projeto:

```bash
cd ..
docker compose up --build
```

Build da imagem de produção:

```bash
docker build -f dockerfile.backend -t datahub-backend .
```

Rodar a imagem de produção manualmente:

```bash
docker run --rm --env-file .env -p 8000:8000 datahub-backend
```

Build da imagem de migration:

```bash
docker build -f dockerfile.backend --target migrate -t datahub-migrate .
```

Rodar a imagem de migration:

```bash
docker run --rm --env-file .env datahub-migrate
```

Para os comandos manuais funcionarem, o `DATABASE_URL` precisa apontar para um PostgreSQL acessível a partir do container. O compose já resolve isso usando a rede Docker do projeto.
