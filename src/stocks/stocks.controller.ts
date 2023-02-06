import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { StocksService } from './stocks.service';
import { CompaniesDto } from './dto/create-stock.dto';
import { StartTradingDto } from './dto/start-trading.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { SellBuyStockDto } from './dto/sell-buy-stock.dto';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  @Post('choose-companies')
  chooseCompanies(@Body() createStockDto: CompaniesDto) {
    return this.stocksService.chooseStocks(createStockDto.companies);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getAvailableStocks() {
    return this.stocksService.getAvailableStocks();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':company')
  getCompany(@Param() params) {
    return this.stocksService.getStocks(params.company);
  }

  @UseGuards(JwtAuthGuard)
  @Get('current/:company')
  getCurrentCompany(@Param() params) {
    return this.stocksService.getCurrentStocks(params.company);
  }

  @UseGuards(JwtAuthGuard)
  @Get('test-stock-by-date')
  testDate() {
    return this.stocksService.getStocksByDate(new Date('11/23/2023'));
  }
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  @Post('start-trading')
  startTrading(@Body() startTradingDto: StartTradingDto) {
    this.stocksService.startTrading(
      new Date(startTradingDto.startDate),
      startTradingDto.delay,
    );
  }
  @UseGuards(JwtAuthGuard)
  @Post('buy-stock')
  buyStock(@Body() buyStockDto: SellBuyStockDto, @Request() req) {
    return this.stocksService.buyStock(buyStockDto, req.user.id);
  }
  @UseGuards(JwtAuthGuard)
  @Post('sell-stock')
  sellStock(@Body() sellStockDto: SellBuyStockDto, @Request() req) {
    return this.stocksService.sellStock(sellStockDto, req.user.id);
  }
}
