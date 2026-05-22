import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { Permissao } from 'src/usuario/interfaces/permissao';

export async function seedAdmin(prisma: PrismaClient) {
  const senha = process.env.ADMIN_SENHA || 'Admin123!';
  const email = process.env.ADMIN_EMAIL || 'admin@admin.com';

  const hash = await argon2.hash(senha, {
    memoryCost: process.env.ARGON_MEMORY_COST
      ? parseInt(process.env.ARGON_MEMORY_COST)
      : 19456,
    timeCost: process.env.ARGON_TIME_COST
      ? parseInt(process.env.ARGON_TIME_COST)
      : 2,
    parallelism: process.env.ARGON_PARALLELISM
      ? parseInt(process.env.ARGON_PARALLELISM)
      : 1,
    hashLength: process.env.ARGON_HASH_LENGTH
      ? parseInt(process.env.ARGON_HASH_LENGTH)
      : 32,
  });

  await prisma.usuario.upsert({
    where: { email },
    update: {
      nome: 'Administrador',
      senha: hash,
      admin: true,
      ativo: true,
      deletedAt: null,
      permissoes: [
        Permissao.GERENCIAR_BASE_DADOS,
        Permissao.GERENCIAR_VISUALIZACOES,
        Permissao.GERENCIAR_CAMPANHAS,
        Permissao.GERENCIAR_INTEGRACOES,
      ],
    },
    create: {
      nome: 'Administrador',
      email,
      senha: hash,
      admin: true,
      ativo: true,
      permissoes: [
        Permissao.GERENCIAR_BASE_DADOS,
        Permissao.GERENCIAR_VISUALIZACOES,
        Permissao.GERENCIAR_CAMPANHAS,
        Permissao.GERENCIAR_INTEGRACOES,
      ],
    },
  });

  console.log(`✔ Superusuário pronto: ${email}`);
}
