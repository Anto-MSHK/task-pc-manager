interface EnvConfig {
  MONGODB_URI: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_EXPIRATION: string;
  JWT_REFRESH_EXPIRATION: string;
  CLICKHOUSE_HOST: string;
  CLICKHOUSE_DB: string;
  CLICKHOUSE_USER: string;
  CLICKHOUSE_PASSWORD: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_PASSWORD: string;
  PORT: string;
  CORS_ORIGIN: string;
}

const requiredKeys = ['MONGODB_URI', 'JWT_ACCESS_SECRET'] as const;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  for (const key of requiredKeys) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    MONGODB_URI: String(config.MONGODB_URI),
    JWT_ACCESS_SECRET: String(config.JWT_ACCESS_SECRET),
    JWT_ACCESS_EXPIRATION: String(config.JWT_ACCESS_EXPIRATION ?? '15m'),
    JWT_REFRESH_EXPIRATION: String(config.JWT_REFRESH_EXPIRATION ?? '7d'),
    CLICKHOUSE_HOST: String(config.CLICKHOUSE_HOST ?? 'http://localhost:8123'),
    CLICKHOUSE_DB: String(config.CLICKHOUSE_DB ?? 'default'),
    CLICKHOUSE_USER: String(config.CLICKHOUSE_USER ?? 'default'),
    CLICKHOUSE_PASSWORD: String(config.CLICKHOUSE_PASSWORD ?? ''),
    REDIS_HOST: String(config.REDIS_HOST ?? 'localhost'),
    REDIS_PORT: String(config.REDIS_PORT ?? '6379'),
    REDIS_PASSWORD: String(config.REDIS_PASSWORD ?? ''),
    PORT: String(config.PORT ?? '3000'),
    CORS_ORIGIN: String(config.CORS_ORIGIN ?? 'http://localhost:5173'),
  };
}
