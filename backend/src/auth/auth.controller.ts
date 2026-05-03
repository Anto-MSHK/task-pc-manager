import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../common/decorators/public.decorator';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { AuthResponseDto, TokenPairDto } from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a user and issue access/refresh tokens' })
  @ApiCreatedResponse({ description: 'User registered successfully', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid registration payload' })
  @ApiConflictResponse({ description: 'Email is already in use' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Login by email and password' })
  @ApiOkResponse({ description: 'Login succeeded', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid login payload' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue a new token pair' })
  @ApiOkResponse({ description: 'Refresh succeeded', type: TokenPairDto })
  @ApiBadRequestResponse({ description: 'Invalid refresh token payload' })
  @ApiUnauthorizedResponse({ description: 'Refresh token is expired or unknown' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }
}
