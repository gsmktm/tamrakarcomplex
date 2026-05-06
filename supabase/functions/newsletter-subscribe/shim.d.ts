declare module "https://esm.sh/@supabase/supabase-js@2" {
  type QueryResult<T = unknown> = Promise<{ data: T | null; error: { message: string } | null }>;

  type QueryBuilder<T = unknown> = {
    select(columns?: string): QueryBuilder<T>;
    insert(values: unknown): QueryBuilder<T>;
    update(values: unknown): QueryBuilder<T>;
    upsert(values: unknown): QueryBuilder<T>;
    delete(): QueryBuilder<T>;
    eq(column: string, value: unknown): QueryBuilder<T>;
    maybeSingle(): QueryResult<T>;
    single(): QueryResult<T>;
    then<TResult1 = { data: T | null; error: { message: string } | null }, TResult2 = never>(
      onfulfilled?: ((value: { data: T | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2>;
  };

  type SupabaseClient = {
    from<T = unknown>(table: string): QueryBuilder<T>;
    rpc<T = unknown>(fn: string, args?: Record<string, unknown>): QueryResult<T>;
  };

  export function createClient(...args: unknown[]): SupabaseClient;
}
