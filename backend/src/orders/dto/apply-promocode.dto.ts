import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyPromocodeDto {
  @ApiProperty({ example: 'SUMMER20', pattern: '^[A-Z0-9_-]{3,32}$' })
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim().toUpperCase())
  @Matches(/^[A-Z0-9_-]{3,32}$/)
  code!: string;
}
