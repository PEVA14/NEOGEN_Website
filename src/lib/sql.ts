/**
 * THE SMALLEST SQL SURFACE THE STORAGE ADAPTERS NEED.
 *
 * Two methods, so the Postgres adapters can run against `pg` in production and
 * against an in-process Postgres (PGlite) in `check:payments` — the same SQL,
 * executed by a real Postgres engine, with no server to install.
 */
export interface SqlResult<R> {
  rows: R[];
}

export interface SqlClient {
  query<R = Record<string, unknown>>(
    text: string,
    params?: readonly unknown[],
  ): Promise<SqlResult<R>>;
  /** Run `fn` in one transaction: all of it commits, or none of it does. */
  transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T>;
}
