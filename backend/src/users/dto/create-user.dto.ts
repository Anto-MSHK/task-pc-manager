import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'manager@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Manager User', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: '+79991234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'strong-password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
