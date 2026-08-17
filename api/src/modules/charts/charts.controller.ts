import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/infrastructure/decorators/public.decorator';
import {
  PublicCache,
  PublicCacheInterceptor,
} from '../../shared/infrastructure/interceptors/public-cache.interceptor';
import { ChartsService } from './charts.service';
import { BillboardChartQueryDto } from './billboard-chart-query.dto';
import {
  BillboardChartPageDto,
  BillboardHistoryDto,
} from './dtos/charts.responses';

@ApiTags('charts')
@Controller('charts')
@UseInterceptors(PublicCacheInterceptor)
export class ChartsController {
  constructor(@Inject(ChartsService) private readonly charts: ChartsService) {}

  @Public()
  @Get('billboard-200')
  @PublicCache(120)
  @ApiOkResponse({ type: BillboardChartPageDto })
  async billboard200(@Query() query: BillboardChartQueryDto) {
    return this.charts.billboard200(query.page, query.perPage);
  }

  /** `null`s quando o álbum nunca entrou no Billboard 200 — nunca 404, é ausência de dado, não erro. */
  @Public()
  @Get('billboard-200/:albumId')
  @PublicCache(120)
  @ApiOkResponse({ type: BillboardHistoryDto })
  async billboardHistory(@Param('albumId') albumId: string) {
    return this.charts.billboardHistory(albumId);
  }
}
