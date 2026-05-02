import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
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

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(
    @Req() req: RequestWithUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.create(req.user.sub, dto);
  }

  @Post(':id/apply-promocode')
  @UseGuards(RateLimitGuard)
  async applyPromocode(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() dto: ApplyPromocodeDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.applyPromocode(id, req.user.sub, dto.code);
  }
}
