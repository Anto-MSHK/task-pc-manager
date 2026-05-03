import { Exclude, Expose, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../schemas/user.schema';

export class UserResponseDto {
  @ApiProperty({ example: '662f0f2bb4f2a33d2f508c10' })
  @Expose()
  @Transform(({ obj }: { obj: User }) => obj._id?.toString())
  id!: string;

  @ApiProperty({ example: 'anna@example.com' })
  @Expose()
  email!: string;

  @ApiProperty({ example: 'Anna Ivanova' })
  @Expose()
  name!: string;

  @ApiPropertyOptional({ example: '+79991234567' })
  @Expose()
  phone?: string;

  @ApiProperty({ example: true })
  @Expose()
  isActive!: boolean;

  @ApiPropertyOptional({ example: '2026-05-02T13:00:00.000Z' })
  @Expose()
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-05-02T13:30:00.000Z' })
  @Expose()
  updatedAt?: Date;

  @Exclude()
  passwordHash?: string;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
    delete (this as Record<string, unknown>).passwordHash;
  }
}
