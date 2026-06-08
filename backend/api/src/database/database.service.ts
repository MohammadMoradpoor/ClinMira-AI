import { Injectable, OnModuleDestroy } from "@nestjs/common"
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg"

import type { TransactionClient } from "./transaction"

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("CLINMIRA_DATABASE_URL is required for simulation persistence")
    this.name = "DatabaseConfigurationError"
  }
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool | undefined

  isConfigured(): boolean {
    return Boolean(process.env.CLINMIRA_DATABASE_URL)
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.getPool().query<T>(sql, values)
  }

  async withTransaction<T>(work: (client: TransactionClient) => Promise<T>): Promise<T> {
    const client = await this.getPool().connect()

    try {
      await client.query("BEGIN")
      const result = await work(client)
      await client.query("COMMIT")
      return result
    } catch (error) {
      await this.rollback(client)
      throw error
    } finally {
      client.release()
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = undefined
    }
  }

  private getPool(): Pool {
    if (!process.env.CLINMIRA_DATABASE_URL) {
      throw new DatabaseConfigurationError()
    }

    this.pool ??= new Pool({
      connectionString: process.env.CLINMIRA_DATABASE_URL,
      application_name: "clinmira-api-bff",
      max: Number.parseInt(process.env.CLINMIRA_DATABASE_POOL_MAX ?? "10", 10),
    })

    return this.pool
  }

  private async rollback(client: PoolClient): Promise<void> {
    try {
      await client.query("ROLLBACK")
    } catch {
      // Preserve the original transaction error; rollback failures are handled by pool release.
    }
  }
}
