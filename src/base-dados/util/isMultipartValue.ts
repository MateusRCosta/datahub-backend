import { MultipartValue } from '@fastify/multipart';

export function isMultipartValue(
  field: unknown,
): field is MultipartValue<string> {
  return (
    typeof field === 'object' &&
    field !== null &&
    !Array.isArray(field) &&
    (field as MultipartValue).type === 'field'
  );
}
