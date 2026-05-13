export type FilterFieldType = 'string' | 'number' | 'boolean' | 'json-array';

export interface PrismaFilterFieldConfig {
  type: FilterFieldType;
}
