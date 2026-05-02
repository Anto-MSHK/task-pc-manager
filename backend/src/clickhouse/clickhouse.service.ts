import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, ClickHouseClient } from '@clickhouse/client';

@Injectable()
export class ClickhouseService implements OnModuleInit, OnModuleDestroy {
  private client!: ClickHouseClient;
  private readonly logger = new Logger(ClickhouseService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.client = createClient({
      host: this.configService.get<string>('CLICKHOUSE_HOST', 'http://localhost:8123'),
      database: this.configService.get<string>('CLICKHOUSE_DB', 'default'),
      username: this.configService.get<string>('CLICKHOUSE_USER', 'default'),
      password: this.configService.get<string>('CLICKHOUSE_PASSWORD', ''),
    });

    await this.createTables();
    this.logger.log('ClickHouse tables are ready');
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  getClient(): ClickHouseClient {
    return this.client;
  }

  async insertRows(table: string, rows: Record<string, unknown>[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    await this.client.insert({
      table,
      values: rows,
      format: 'JSONEachRow',
      clickhouse_settings: {
        // Accept ISO-8601 strings (e.g. "2026-01-01T12:00:00.000Z") for DateTime64 columns
        date_time_input_format: 'best_effort',
      },
    });
  }

  async queryRows<T>(query: string, params?: Record<string, unknown>): Promise<T[]> {
    const result = await this.client.query({
      query,
      query_params: params,
      format: 'JSONEachRow',
    });
    return result.json<T>();
  }

  private async createTables(): Promise<void> {
    // Drop + recreate ensures schema changes (e.g. DateTime → DateTime64) are applied on restart.
    // Safe for dev; in production, use proper migrations.
    const tables = ['users', 'promocodes', 'orders', 'promo_usages'];
    for (const t of tables) {
      await this.client.command({ query: `DROP TABLE IF EXISTS ${t}` });
    }

    await this.client.command({
      query: `
        CREATE TABLE users (
          id String,
          email String,
          name String,
          phone Nullable(String),
          isActive UInt8,
          createdAt DateTime64(3, 'UTC'),
          updatedAt DateTime64(3, 'UTC')
        ) ENGINE = ReplacingMergeTree(updatedAt)
        ORDER BY (id)
      `,
    });

    await this.client.command({
      query: `
        CREATE TABLE promocodes (
          id String,
          code String,
          discountPercent UInt8,
          maxUsages Nullable(UInt32),
          maxUsagesPerUser Nullable(UInt32),
          dateFrom Nullable(DateTime64(3, 'UTC')),
          dateTo Nullable(DateTime64(3, 'UTC')),
          isActive UInt8,
          createdAt DateTime64(3, 'UTC'),
          updatedAt DateTime64(3, 'UTC')
        ) ENGINE = ReplacingMergeTree(updatedAt)
        ORDER BY (id)
      `,
    });

    await this.client.command({
      query: `
        CREATE TABLE orders (
          id String,
          userId String,
          userName String,
          userEmail String,
          promocodeId Nullable(String),
          promocodeCode Nullable(String),
          amount Decimal(12, 2),
          discountAmount Decimal(12, 2),
          finalAmount Decimal(12, 2),
          createdAt DateTime64(3, 'UTC'),
          updatedAt DateTime64(3, 'UTC')
        ) ENGINE = ReplacingMergeTree(updatedAt)
        ORDER BY (id)
      `,
    });

    await this.client.command({
      query: `
        CREATE TABLE promo_usages (
          id String,
          promocodeId String,
          promocodeCode String,
          userId String,
          userName String,
          userEmail String,
          orderId String,
          discountAmount Decimal(12, 2),
          usedAt DateTime64(3, 'UTC'),
          createdAt DateTime64(3, 'UTC')
        ) ENGINE = MergeTree()
        ORDER BY (usedAt, id)
      `,
    });
  }
}
