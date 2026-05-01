import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const redisClient = this.redisService.getClient();
    
    // Simplistic fixed window rate limiting for demonstration
    // E.g. 10 requests per minute
    const key = `rate-limit:${ip}`;
    const current = await redisClient.incr(key);
    if (current === 1) {
      await redisClient.expire(key, 60);
    }
    
    if (current > 10) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    
    return true;
  }
}
