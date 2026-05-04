import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CreatePromocodeDto } from './dto/create-promocode.dto';
import { PromocodeResponseDto } from './dto/promocode-response.dto';
import { UpdatePromocodeDto } from './dto/update-promocode.dto';
import { PromocodesService } from './promocodes.service';

@ApiTags('promocodes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Authenticated user is not allowed to access the resource' })
@Controller('promocodes')
export class PromocodesController {
  constructor(private readonly promocodesService: PromocodesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a promocode' })
  @ApiCreatedResponse({ description: 'Promocode created successfully', type: PromocodeResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid promocode payload' })
  async create(@Body() dto: CreatePromocodeDto): Promise<PromocodeResponseDto> {
    return this.promocodesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List promocodes' })
  @ApiOkResponse({ description: 'Promocodes returned successfully', type: [PromocodeResponseDto] })
  async findAll(): Promise<PromocodeResponseDto[]> {
    return this.promocodesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a promocode by id' })
  @ApiOkResponse({ description: 'Promocode returned successfully', type: PromocodeResponseDto })
  @ApiNotFoundResponse({ description: 'Promocode not found' })
  async findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<PromocodeResponseDto> {
    return this.promocodesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a promocode' })
  @ApiOkResponse({ description: 'Promocode updated successfully', type: PromocodeResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid promocode payload' })
  @ApiNotFoundResponse({ description: 'Promocode not found' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdatePromocodeDto,
  ): Promise<PromocodeResponseDto> {
    return this.promocodesService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a promocode' })
  @ApiOkResponse({ description: 'Promocode deactivated successfully', type: PromocodeResponseDto })
  @ApiNotFoundResponse({ description: 'Promocode not found' })
  async deactivate(@Param('id', ParseObjectIdPipe) id: string): Promise<PromocodeResponseDto> {
    return this.promocodesService.deactivate(id);
  }
}
