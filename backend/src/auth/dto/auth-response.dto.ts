import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class TokenPairDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI662f0f2bb4f2a33d2f508c10IiwiaWF0IjoxNzE0NzQwMDAwfQ.signature',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'd7f2d9a8f4f2b7d1d6f6f1a7d5f0c8b9e2a4c6f8d0b1e3a5c7f9d2b4a6c8e0f1',
  })
  refreshToken!: string;
}

export class AuthResponseDto extends TokenPairDto {
  @ApiProperty({ type: () => UserResponseDto })
  user!: UserResponseDto;
}
