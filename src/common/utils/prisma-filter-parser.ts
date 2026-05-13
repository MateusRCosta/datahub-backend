import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaFilterFieldConfig } from '../interfaces/prisma-filter-config.interface';

type QueryValue = string | number | boolean | string[] | undefined;

function isEmptyValue(value: QueryValue) {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim().length === 0;
  return false;
}

function toNumber(field: string, value: QueryValue) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) {
    throw new BadRequestException(`O campo "${field}" deve ser numerico`);
  }

  return parsed;
}

function toBoolean(field: string, value: QueryValue) {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (typeof normalized === 'boolean') return normalized;
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  if (normalized === '1') return true;
  if (normalized === '0') return false;

  throw new BadRequestException(`O campo "${field}" deve ser booleano`);
}

function toStringArray(value: QueryValue) {
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function buildPrismaWhere<TWhere extends Record<string, unknown>>(
  filters: Record<string, QueryValue>,
  config: Record<string, PrismaFilterFieldConfig>,
  baseWhere: TWhere,
) {
  const where: Record<string, unknown> = { ...baseWhere };

  for (const [field, fieldConfig] of Object.entries(config)) {
    const value = filters[field];

    if (isEmptyValue(value)) continue;

    switch (fieldConfig.type) {
      case 'string':
        where[field] = {
          contains: Array.isArray(value) ? value[0] : String(value).trim(),
          mode: Prisma.QueryMode.insensitive,
        };
        break;

      case 'number':
        where[field] = toNumber(field, value);
        break;

      case 'boolean':
        where[field] = toBoolean(field, value);
        break;

      case 'json-array': {
        const values = toStringArray(value);

        if (values.length > 0) {
          where[field] = {
            array_contains: values,
          };
        }
        break;
      }
    }
  }

  return where as TWhere;
}

export function buildPrismaOrderBy(
  orderBy: string | undefined,
  order: 'asc' | 'desc' | undefined,
  allowedFields: string[],
  fallbackField: string,
) {
  const field = orderBy ?? fallbackField;

  if (!allowedFields.includes(field)) {
    throw new BadRequestException(
      `O campo "${field}" nao pode ser usado para ordenacao`,
    );
  }

  return {
    [field]: order ?? 'desc',
  };
}
