import type { PoolClient, QueryResult, QueryResultRow } from "pg"

export interface TransactionClient {
  query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>
}

export type PgTransactionClient = PoolClient
