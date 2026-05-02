import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

export class ApplyPromocodeDto {
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim().toUpperCase())
  @Matches(/^[A-Z0-9_-]{3,32}$/)
  code!: string;
}
