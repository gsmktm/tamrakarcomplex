/**
 * Distinguish an empty successful query from a failed or malformed response.
 * Callers must let failures reject React Query rather than rendering zero orders.
 */
export function requireOrderQueryData<T>(
  response: { data: T | null; error: unknown },
  operation: string,
): T {
  if (response.error) throw response.error;
  if (response.data == null) {
    throw new Error(`${operation} returned no data`);
  }
  return response.data;
}
