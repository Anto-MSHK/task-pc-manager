import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RateLimitGuard } from '../src/common/guards/rate-limit.guard';
import { RedisService } from '../src/redis/redis.service';

// ─────────────────────────────────────────────────────────────
// HttpExceptionFilter
// ─────────────────────────────────────────────────────────────

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => ({}),
      }),
    } as unknown as ArgumentsHost;
  });

  it('serialises HttpException into { statusCode, timestamp, message, error }', () => {
    filter.catch(new HttpException({ message: 'Not found', error: 'Not Found' }, 404), host);

    expect(statusMock).toHaveBeenCalledWith(404);
    const body = jsonMock.mock.calls[0][0] as Record<string, unknown>;
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('Not found');
    expect(body.timestamp).toBeDefined();
  });

  it('returns 500 for unknown (non-HttpException) errors', () => {
    filter.catch(new Error('unexpected'), host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = jsonMock.mock.calls[0][0] as Record<string, unknown>;
    expect(body.statusCode).toBe(500);
  });

  it('handles ValidationPipe array-message format', () => {
    const validationException = new HttpException(
      { message: ['email must be an email', 'password is too short'], error: 'Bad Request' },
      400,
    );

    filter.catch(validationException, host);

    const body = jsonMock.mock.calls[0][0] as Record<string, unknown>;
    expect(body.statusCode).toBe(400);
    expect(Array.isArray(body.message)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// RateLimitGuard
// ─────────────────────────────────────────────────────────────

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let redisClient: {
    zremrangebyscore: jest.Mock;
    zadd: jest.Mock;
    expire: jest.Mock;
    zcard: jest.Mock;
  };

  function buildContext(ip = '127.0.0.1') {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          ip,
          socket: { remoteAddress: ip },
          method: 'POST',
          route: { path: '/auth/login' },
          path: '/auth/login',
        }),
      }),
    };
  }

  beforeEach(() => {
    redisClient = {
      zremrangebyscore: jest.fn().mockResolvedValue(0),
      zadd: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      zcard: jest.fn(),
    };

    guard = new RateLimitGuard({
      getClient: () => redisClient,
    } as unknown as RedisService);
  });

  it('allows request when under the limit', async () => {
    redisClient.zcard.mockResolvedValue(5);

    const result = await guard.canActivate(buildContext() as never);

    expect(result).toBe(true);
  });

  it('throws 429 when limit exceeded', async () => {
    redisClient.zcard.mockResolvedValue(11);

    await expect(guard.canActivate(buildContext() as never)).rejects.toMatchObject({
      status: 429,
    });
  });

  it('uses separate Redis keys for different IPs', async () => {
    redisClient.zcard.mockResolvedValue(1);

    await guard.canActivate(buildContext('10.0.0.1') as never);
    await guard.canActivate(buildContext('10.0.0.2') as never);

    const keys = (redisClient.zadd as jest.Mock).mock.calls.map((c) => c[0] as string);
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[0]).toContain('10.0.0.1');
    expect(keys[1]).toContain('10.0.0.2');
  });
});
