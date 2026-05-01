import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      phone: dto.phone,
      passwordHash,
    });

    return this.generateTokens(user._id.toString());
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user._id.toString());
  }

  async refresh(refreshToken: string) {
    const userId = await this.redisService.getClient().get(`refresh_token:${refreshToken}`);
    if (!userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    // Invalidate old refresh token
    await this.redisService.getClient().del(`refresh_token:${refreshToken}`);
    
    return this.generateTokens(userId);
  }

  private async generateTokens(userId: string) {
    const payload = { sub: userId };
    const accessToken = this.jwtService.sign(payload);
    
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshExpiresInStr = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
    
    // simple parsing for 7d = 7 * 24 * 60 * 60 seconds
    let expireSeconds = 7 * 24 * 60 * 60; 
    if (refreshExpiresInStr.endsWith('d')) {
      expireSeconds = parseInt(refreshExpiresInStr) * 24 * 60 * 60;
    }
    
    await this.redisService.getClient().setex(`refresh_token:${refreshToken}`, expireSeconds, userId);

    return {
      accessToken,
      refreshToken,
    };
  }
}
