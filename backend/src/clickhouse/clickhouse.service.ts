import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, ClickHouseClient } from '@clickhouse/client';

@Injectable()
export class ClickhouseService implements OnModuleInit, OnModuleDestroy {
  private client!: ClickHouseClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.client = createClient({
      host: this.configService.get<string>('CLICKHOUSE_HOST', 'http://localhost:8123'),
      database: this.configService.get<string>('CLICKHOUSE_DB', 'default'),
      username: this.configService.get<string>('CLICKHOUSE_USER', 'default'),
      password: this.configService.get<string>('CLICKHOUSE_PASSWORD', ''),
    });
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  getClient(): ClickHouseClient {
    return this.client;
  }
}
