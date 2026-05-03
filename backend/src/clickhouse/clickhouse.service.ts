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
      url: this.configService.get<string>('CLICKHOUSE_HOST', 'http://localhost:8123'),
      database: this.configService.get<string>('CLICKHOUSE_DB', 'default'),
      username: this.configService.get<string>('CLICKHOUSE_USER', 'default'),
      password: this.configService.get<string>('CLICKHOUSE_PASSWORD', ''),
      clickhouse_settings: {
        // Accept ISO-8601 strings (e.g. "2026-01-01T12:00:00.000Z") for DateTime64 columns
        date_time_input_format: 'best_effort',
      },
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
    await this.client.command({
      query: `
        CREATE TABLE IF NOT EXISTS users (
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
        CREATE TABLE IF NOT EXISTS promocodes (
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
        CREATE TABLE IF NOT EXISTS orders (
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
        CREATE TABLE IF NOT EXISTS promo_usages (
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
