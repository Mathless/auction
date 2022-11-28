import { Module } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { StocksController } from './stocks.controller';
import { EventsGateway } from './stocks.gateway';

@Module({
  controllers: [StocksController],
  providers: [StocksService, EventsGateway],
})
export class StocksModule {}
