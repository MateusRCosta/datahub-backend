import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import configuration from './configuration';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const { databaseUrl } = configuration();
    const adapter = new PrismaPg(
      new Pool({
        connectionString: databaseUrl,
      }),
    );
    super({ adapter });
  }
}
