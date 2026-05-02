import { Exclude, Expose, Transform } from 'class-transformer';
import { User } from '../schemas/user.schema';

export class UserResponseDto {
  @Expose()
  @Transform(({ obj }: { obj: User }) => obj._id?.toString())
  id!: string;

  @Expose()
  email!: string;

  @Expose()
  name!: string;

  @Expose()
  phone?: string;

  @Expose()
  isActive!: boolean;

  @Expose()
  createdAt?: Date;

  @Expose()
  updatedAt?: Date;

  @Exclude()
  passwordHash?: string;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
    delete (this as Record<string, unknown>).passwordHash;
  }
}
