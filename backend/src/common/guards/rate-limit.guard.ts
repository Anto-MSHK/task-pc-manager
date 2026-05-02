import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { RedisService } from '../../redis/redis.service';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 10;

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const redisClient = this.redisService.getClient();

    const now = Date.now();
    const windowStart = now - WINDOW_SECONDS * 1000;
    const route = `${request.method}:${request.route?.path ?? request.path}`;
    const key = `rate-limit:${route}:${ip}`;

    await redisClient.zremrangebyscore(key, 0, windowStart);
    await redisClient.zadd(key, now, `${now}:${randomUUID()}`);
    await redisClient.expire(key, WINDOW_SECONDS);

    const current = await redisClient.zcard(key);
    if (current > MAX_REQUESTS) {
      throw new HttpException(
        {
          message: `Rate limit exceeded. Try again in ${WINDOW_SECONDS} seconds.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
