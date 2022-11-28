import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { CompaniesDto } from './dto/create-stock.dto';
import { StartTradingDto } from './dto/start-trading.dto';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Post('choose-companies')
  chooseCompanies(@Body() createStockDto: CompaniesDto) {
    return this.stocksService.chooseStocks(createStockDto.companies);
  }

  @Get()
  getAvailableStocks() {
    return this.stocksService.getAvailableStocks();
  }

  @Get(':company')
  getCompany(@Param() params) {
    return this.stocksService.getStocks(params.company);
  }

  @Get('test-stock-by-date')
  testDate() {
    return this.stocksService.getStocksByDate(new Date('11/23/2023'));
  }

  @Post('start-trading')
  startTrading(@Body() startTradingDto: StartTradingDto) {
    this.stocksService.startTrading(
      new Date(startTradingDto.startDate),
      startTradingDto.delay,
    );
  }
}
