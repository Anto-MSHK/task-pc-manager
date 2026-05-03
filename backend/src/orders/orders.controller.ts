import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { ApplyPromocodeDto } from './dto/apply-promocode.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

interface JwtPayload {
  sub: string;
}

interface RequestWithUser extends Request {
  user: JwtPayload;
}

@ApiTags('orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an order for the current user' })
  @ApiCreatedResponse({ description: 'Order created successfully', type: OrderResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid order payload or inactive user' })
  async create(
    @Req() req: RequestWithUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.create(req.user.sub, dto);
  }

  @Post(':id/apply-promocode')
  @UseGuards(RateLimitGuard)
  @ApiOperation({
    summary: 'Apply a promocode to an order',
    description:
      'Uses a Redis lock by promocode id plus atomic MongoDB update to prevent duplicate or over-limit applications.',
  })
  @ApiOkResponse({ description: 'Promocode applied successfully', type: OrderResponseDto })
  @ApiBadRequestResponse({
    description: 'Promocode is inactive, expired, not yet active, or limit reached',
  })
  @ApiForbiddenResponse({ description: 'Order does not belong to the current user' })
  @ApiNotFoundResponse({ description: 'Order or promocode not found' })
  @ApiConflictResponse({ description: 'Promocode is already applied or locked by another request' })
  async applyPromocode(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() dto: ApplyPromocodeDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.applyPromocode(id, req.user.sub, dto.code);
  }
}
