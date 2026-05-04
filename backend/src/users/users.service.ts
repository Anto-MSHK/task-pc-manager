import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { OutboxService } from '../outbox/outbox.service';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { User } from './schemas/user.schema';

interface CreateUserInput {
  email: string;
  name: string;
  phone?: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectConnection() private readonly connection: Connection,
    private readonly outboxService: OutboxService,
    private readonly clickhouseService: ClickhouseService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async create(createData: CreateUserInput): Promise<User> {
    const session = await this.connection.startSession();
    let createdUser!: User;

    try {
      await session.withTransaction(async () => {
        const newUser = new this.userModel(createData);
        createdUser = await newUser.save({ session });

        await this.outboxService.enqueue(
          {
            eventType: 'users.upserted',
            aggregateType: 'users',
            aggregateId: createdUser._id.toString(),
            operation: 'upsert',
            payload: {
              id: createdUser._id.toString(),
              email: createdUser.email,
              name: createdUser.name,
              phone: createdUser.phone ?? null,
              isActive: createdUser.isActive ? 1 : 0,
              createdAt: createdUser.createdAt.toISOString(),
              updatedAt: createdUser.updatedAt.toISOString(),
            },
          },
          session,
        );
      });
    } catch (err) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException('Email already in use');
      }
      throw err;
    } finally {
      await session.endSession();
    }

    await this.analyticsService.invalidateCache('users', 'summary');
    return createdUser;
  }

  async createFromDto(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.userModel.findOne({ email: dto.email }).lean().exec();
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, await bcrypt.genSalt());
    const user = await this.create({
      email: dto.email,
      name: dto.name,
      phone: dto.phone,
      passwordHash,
    });

    return new UserResponseDto(user.toObject());
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).select('+passwordHash').exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userModel.find().sort({ createdAt: -1 }).exec();
    return users.map((user) => new UserResponseDto(user.toObject()));
  }

  async findOneResponse(id: string): Promise<UserResponseDto> {
    const user = await this.findByIdOrFail(id);
    return new UserResponseDto(user.toObject());
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field should be provided');
    }

    const currentUser = await this.findByIdOrFail(id);
    if (dto.email && dto.email !== currentUser.email) {
      const existing = await this.userModel.findOne({ email: dto.email }).lean().exec();
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    const patch: Partial<User> & { passwordHash?: string } = {};
    if (dto.email) {
      patch.email = dto.email;
    }
    if (dto.name) {
      patch.name = dto.name;
    }
    if (typeof dto.phone === 'string') {
      patch.phone = dto.phone;
    }
    if (typeof dto.isActive === 'boolean') {
      patch.isActive = dto.isActive;
    }
    if (dto.password) {
      patch.passwordHash = await bcrypt.hash(dto.password, await bcrypt.genSalt());
    }

    const session = await this.connection.startSession();
    let updatedUser!: User;

    try {
      await session.withTransaction(async () => {
        const user = await this.userModel.findByIdAndUpdate(id, patch, { new: true, session });
        if (!user) {
          throw new NotFoundException('User not found');
        }
        updatedUser = user;

        await this.outboxService.enqueue(
          {
            eventType: 'users.upserted',
            aggregateType: 'users',
            aggregateId: updatedUser._id.toString(),
            operation: 'upsert',
            payload: {
              id: updatedUser._id.toString(),
              email: updatedUser.email,
              name: updatedUser.name,
              phone: updatedUser.phone ?? null,
              isActive: updatedUser.isActive ? 1 : 0,
              createdAt: updatedUser.createdAt.toISOString(),
              updatedAt: updatedUser.updatedAt.toISOString(),
            },
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    await this.syncUserCascade(updatedUser);
    await this.analyticsService.invalidateCache();

    return new UserResponseDto(updatedUser.toObject());
  }

  async deactivate(id: string): Promise<UserResponseDto> {
    return this.update(id, { isActive: false });
  }

  async ensureActiveById(id: string): Promise<User> {
    const user = await this.findByIdOrFail(id);
    if (!user.isActive) {
      throw new BadRequestException('User is inactive');
    }
    return user;
  }

  /**
   * When user name/email changes, re-insert denormalized rows in the orders CH table
   * (ReplacingMergeTree) so that orders.userName/userEmail stay consistent.
   *
   * Note: promo_usages is an append-only MergeTree, so each row is a historical snapshot
   * of the user/promocode at the moment of use; we intentionally don't rewrite it.
   */
  /**
   * Checks whether a Mongoose/MongoDB error is a duplicate key error (code 11000).
   */
  private isDuplicateKeyError(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: unknown }).code === 11000
    );
  }

  private async syncUserCascade(user: User): Promise<void> {
    const userId = user._id.toString();

    type OrderRow = {
      id: string;
      userId: string;
      promocodeId: string | null;
      promocodeCode: string | null;
      amount: number;
      discountAmount: number;
      finalAmount: number;
      createdAt: string;
      updatedAt: string;
    };

    const orders = await this.clickhouseService.queryRows<OrderRow>(
      `SELECT DISTINCT ON (id) id, userId, promocodeId, promocodeCode,
              amount, discountAmount, finalAmount, createdAt, updatedAt
       FROM orders FINAL
       WHERE userId = {userId:String}`,
      { userId },
    );

    if (orders.length === 0) {
      return;
    }

    const updatedOrders = orders.map((row) => ({
      ...row,
      userName: user.name,
      userEmail: user.email,
    }));

    await this.clickhouseService.insertRows('orders', updatedOrders);
  }
}
