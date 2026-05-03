import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromocodeDto {
  @ApiProperty({ example: 'SUMMER20', pattern: '^[A-Z0-9_-]{3,32}$' })
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim().toUpperCase())
  @Matches(/^[A-Z0-9_-]{3,32}$/)
  code!: string;

  @ApiProperty({ example: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent!: number;

  @ApiPropertyOptional({ example: 100, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  maxUsages?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  maxUsagesPerUser?: number;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z', type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.000Z', type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;
}
