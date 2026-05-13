import * as argon2 from 'argon2';
import configuration from './configuration';

const { argon } = configuration();

export const argonConfig = {
  type: argon2.argon2id,
  memoryCost: argon.memoryCost,
  timeCost: argon.timeCost,
  parallelism: argon.parallelism,
  hashLength: argon.hashLength,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, argonConfig);
}

export async function verifyPassword(
  passwordHash: string,
  plainPassword: string,
): Promise<boolean> {
  return argon2.verify(passwordHash, plainPassword);
}
