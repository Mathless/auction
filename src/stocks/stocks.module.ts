import { Module } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { StocksController } from './stocks.controller';
import { EventsGateway } from './stocks.gateway';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [EventEmitterModule.forRoot(), UsersModule],
  controllers: [StocksController],
  providers: [StocksService, EventsGateway],
})
export class StocksModule {}
