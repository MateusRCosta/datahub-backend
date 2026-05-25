-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "senha" VARCHAR(255) NOT NULL,
    "permissoes" JSONB,
    "admin" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" SERIAL NOT NULL,
    "sid" UUID NOT NULL,
    "dados" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiredAt" TIMESTAMPTZ,
    "revokedAt" TIMESTAMPTZ,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "basesDeDados" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "estrutura" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ,
    "deletedAt" TIMESTAMPTZ,
    "usuarioId" INTEGER,
    "integracaoId" INTEGER,

    CONSTRAINT "basesDeDados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "dados" JSONB NOT NULL,
    "validacao" JSONB,
    "hash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ,
    "deletedAt" TIMESTAMPTZ,
    "baseDeDadosId" INTEGER NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integracoes" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "limitDeRequisicaoPorMin" INTEGER NOT NULL,
    "horaExecucao" SMALLINT NOT NULL DEFAULT 0,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "urlAuth" VARCHAR(200),
    "metodoAuth" VARCHAR(20) DEFAULT 'POST',
    "headersAuth" JSONB,
    "variaveisAuth" JSONB,
    "bodyAuth" TEXT,
    "responseAuth" JSONB,
    "urlRefresh" VARCHAR(200),
    "metodoRefresh" VARCHAR(20) DEFAULT 'POST',
    "headersRefresh" JSONB,
    "variaveisRefresh" JSONB,
    "bodyRefresh" TEXT,
    "responseRefresh" JSONB,
    "urlScrap" VARCHAR(200) NOT NULL,
    "metodoScrap" VARCHAR(20) NOT NULL DEFAULT 'GET',
    "headersScrap" JSONB,
    "variaveisScrap" JSONB,
    "bodyScrap" TEXT,
    "responseScrap" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ,
    "deletedAt" TIMESTAMPTZ,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "integracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integracoesCampanhas" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "provedor" VARCHAR(50) NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ,
    "deletedAt" TIMESTAMPTZ,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "integracoesCampanhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" SERIAL NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "scheduledAt" TIMESTAMPTZ NOT NULL,
    "executedAt" TIMESTAMPTZ,
    "finishedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "integracaoId" INTEGER NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "views" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" VARCHAR(256),
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ,
    "deletedAt" TIMESTAMPTZ,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "config" JSONB NOT NULL,
    "quantidadeVars" SMALLINT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ,
    "deletedAt" TIMESTAMPTZ,
    "usuarioId" INTEGER NOT NULL,
    "integracaoCampanhaId" INTEGER NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanhas" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "status" VARCHAR(25) NOT NULL DEFAULT 'pendente',
    "vars" JSONB NOT NULL,
    "contatoCampo" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ,
    "deletedAt" TIMESTAMPTZ,
    "lockedAt" TIMESTAMPTZ,
    "scheduledAt" TIMESTAMPTZ NOT NULL,
    "executedAt" TIMESTAMPTZ,
    "finishedAt" TIMESTAMPTZ,
    "usuarioId" INTEGER NOT NULL,
    "viewId" INTEGER,
    "baseDeDadoId" INTEGER,
    "templateId" INTEGER NOT NULL,

    CONSTRAINT "campanhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientesCampanhas" (
    "id" SERIAL NOT NULL,
    "status" VARCHAR(25) NOT NULL DEFAULT 'naoEnviado',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ,
    "campanhaId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,

    CONSTRAINT "clientesCampanhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cache" (
    "chave" VARCHAR(255) NOT NULL,
    "dados" JSONB NOT NULL,
    "expiresAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cache_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_sid_key" ON "sessoes"("sid");

-- CreateIndex
CREATE INDEX "campanhas_status_scheduledAt_deletedAt_idx" ON "campanhas"("status", "scheduledAt", "deletedAt");

-- CreateIndex
CREATE INDEX "campanhas_lockedAt_idx" ON "campanhas"("lockedAt");

-- CreateIndex
CREATE INDEX "clientesCampanhas_campanhaId_status_idx" ON "clientesCampanhas"("campanhaId", "status");

-- CreateIndex
CREATE INDEX "clientesCampanhas_clienteId_idx" ON "clientesCampanhas"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "clientesCampanhas_campanhaId_clienteId_key" ON "clientesCampanhas"("campanhaId", "clienteId");

-- CreateIndex
CREATE INDEX "cache_expiresAt_idx" ON "cache"("expiresAt");

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "basesDeDados" ADD CONSTRAINT "basesDeDados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "basesDeDados" ADD CONSTRAINT "basesDeDados_integracaoId_fkey" FOREIGN KEY ("integracaoId") REFERENCES "integracoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_baseDeDadosId_fkey" FOREIGN KEY ("baseDeDadosId") REFERENCES "basesDeDados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integracoes" ADD CONSTRAINT "integracoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integracoesCampanhas" ADD CONSTRAINT "integracoesCampanhas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_integracaoId_fkey" FOREIGN KEY ("integracaoId") REFERENCES "integracoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "views" ADD CONSTRAINT "views_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_integracaoCampanhaId_fkey" FOREIGN KEY ("integracaoCampanhaId") REFERENCES "integracoesCampanhas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanhas" ADD CONSTRAINT "campanhas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanhas" ADD CONSTRAINT "campanhas_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "views"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanhas" ADD CONSTRAINT "campanhas_baseDeDadoId_fkey" FOREIGN KEY ("baseDeDadoId") REFERENCES "basesDeDados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanhas" ADD CONSTRAINT "campanhas_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientesCampanhas" ADD CONSTRAINT "clientesCampanhas_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "campanhas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientesCampanhas" ADD CONSTRAINT "clientesCampanhas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
