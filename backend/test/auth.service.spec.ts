import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { RedisService } from '../src/redis/redis.service';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed-pw'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

function buildUser(overrides = {}) {
  return {
    _id: { toString: () => 'user-id-1' },
    email: 'test@example.com',
    name: 'Test User',
    phone: undefined,
    isActive: true,
    passwordHash: 'hashed-pw',
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: function () {
      return { ...this };
    },
    ...overrides,
  };
}

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findByEmail' | 'findByEmailWithPassword' | 'create' | 'findById'>
  >;
  let redisClient: { setex: jest.Mock; get: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    redisClient = {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
    };

    usersService = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('access-token') },
        },
        {
          provide: RedisService,
          useValue: { getClient: () => redisClient },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              const cfg: Record<string, string> = {
                JWT_REFRESH_EXPIRATION: '7d',
              };
              return cfg[key] ?? fallback ?? '';
            }),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─────────────────────────────────────────
  // register
  // ─────────────────────────────────────────

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(buildUser());

      await expect(
        authService.register({ email: 'test@example.com', password: 'pass123', name: 'T' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user and returns accessToken + refreshToken + user without passwordHash', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (usersService.create as jest.Mock).mockResolvedValue(buildUser());

      const result = await authService.register({
        email: 'new@example.com',
        password: 'pass123',
        name: 'New User',
      });

      expect(result.accessToken).toBe('access-token');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken.length).toBeGreaterThan(0);
      expect(result.user).toBeDefined();
      expect((result.user as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────
  // login
  // ─────────────────────────────────────────

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      (usersService.findByEmailWithPassword as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'pass123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      (usersService.findByEmailWithPassword as jest.Mock).mockResolvedValue(buildUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─────────────────────────────────────────
  // refresh
  // ─────────────────────────────────────────

  describe('refresh', () => {
    it('rotates refresh token: old key deleted, new key stored, new tokens returned', async () => {
      const oldToken = 'old-refresh-token';
      redisClient.get.mockResolvedValue('user-id-1');

      const result = await authService.refresh(oldToken);

      expect(redisClient.del).toHaveBeenCalledWith(`refresh_token:${oldToken}`);
      expect(redisClient.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh_token:/),
        expect.any(Number),
        'user-id-1',
      );
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).not.toBe(oldToken);
    });

    it('throws UnauthorizedException for expired/unknown refresh token', async () => {
      redisClient.get.mockResolvedValue(null);

      await expect(authService.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
