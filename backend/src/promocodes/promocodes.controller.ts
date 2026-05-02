import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreatePromocodeDto } from './dto/create-promocode.dto';
import { PromocodeResponseDto } from './dto/promocode-response.dto';
import { UpdatePromocodeDto } from './dto/update-promocode.dto';
import { PromocodesService } from './promocodes.service';

@Controller('promocodes')
export class PromocodesController {
  constructor(private readonly promocodesService: PromocodesService) {}

  @Post()
  async create(@Body() dto: CreatePromocodeDto): Promise<PromocodeResponseDto> {
    return this.promocodesService.create(dto);
  }

  @Get()
  async findAll(): Promise<PromocodeResponseDto[]> {
    return this.promocodesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PromocodeResponseDto> {
    return this.promocodesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePromocodeDto,
  ): Promise<PromocodeResponseDto> {
    return this.promocodesService.update(id, dto);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string): Promise<PromocodeResponseDto> {
    return this.promocodesService.deactivate(id);
  }
}
