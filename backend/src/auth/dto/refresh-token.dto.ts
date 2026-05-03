import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'd7f2d9a8f4f2b7d1d6f6f1a7d5f0c8b9e2a4c6f8d0b1e3a5c7f9d2b4a6c8e0f1',
    minLength: 32,
  })
  @IsString()
  @MinLength(32)
  refreshToken!: string;
}
