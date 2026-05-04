import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'anna@example.com', description: 'Unique user email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'strong-password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Anna Ivanova', description: 'Display name', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: '+79991234567', description: 'Optional phone number' })
  @IsString()
  @IsOptional()
  phone?: string;
}
