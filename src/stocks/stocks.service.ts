import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { readdir, readFile } from 'fs';
import * as path from 'path';
import { interval, Observable, share, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SellBuyStockDto } from './dto/sell-buy-stock.dto';
import { json } from 'express';
import { UsersService } from '../users/users.service';
@Injectable()
export class StocksService implements OnModuleInit {
  private tradingSubscription: Subscription;
  private currentData: any;
  private tradingInterval: any;
  private currentDate: Date;
  private isTradingGoing: boolean;
  private startDate: Date;
  static getCompanyName(symbol: string) {
    switch (symbol) {
      case 'AAPL':
        return 'Apple, Inc.';
      case 'AMD':
        return 'Advanced Micro Devices, Inc.';
      case 'AMZN':
        return 'Amazon.com, Inc.';
      case 'CSCO':
        return 'Cisco Systems, Inc.';
      case 'MSFT':
        return 'Microsoft, Inc.';
      case 'QCOM':
        return 'QUALCOMM Incorporated';
      case 'SBUX':
        return 'Starbucks, Inc.';
      default:
        return '';
    }
  }

  static getDateString(date: Date) {
    return `${('0' + (date.getMonth() + 1)).slice(-2)}/${(
      '0' + date.getDate()
    ).slice(-2)}/${date.getFullYear()}`;
  }

  static addDays(date: string, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private readonly stocksData;
  private chosenCompanies;
  constructor(
    private eventEmitter: EventEmitter2,
    private userService: UsersService,
  ) {
    this.isTradingGoing = false;
    this.stocksData = {};
    this.chosenCompanies = {};
  }
  async onModuleInit() {
    await this.initializeData();
  }

  private async initializeData() {
    const dirName = path.join(__dirname, 'json');
    readdir(dirName, (err, fileList) => {
      if (err) {
        console.error(err);
        return;
      }

      for (let i = 0; i < fileList.length; i++) {
        const filename = fileList[i];
        if (!filename.toLowerCase().endsWith('.json')) continue;

        const fullFilename = path.join(dirName, filename);
        readFile(fullFilename, { encoding: 'utf-8' }, (err, data) => {
          try {
            const fileContent = JSON.parse(data);
            this.processJson(fileContent, filename);
          } catch (err) {
            console.error(`error while parsing file: ${fullFilename}`);
          }
        });
      }
    });
  }

  async getAvailableStocks() {
    return Object.fromEntries(
      Object.keys(this.stocksData).map((symbol) => [
        symbol,
        {
          value: StocksService.getCompanyName(symbol),
          chosen: this.chosenCompanies[symbol] === true,
        },
      ]),
    );
  }

  getStocks(companyName: string) {
    return this.stocksData[companyName];
  }

  getCurrentStocks(companyName: string) {
    const companyStockData = this.stocksData[companyName];
    if (!this.isTradingGoing) {
      throw new BadRequestException('Торги ещё не начаты');
    }
    if (!companyStockData) {
      throw new BadRequestException(
        'Акции такой компании не выставлены на торги',
      );
    }
    return Object.keys(companyStockData)
      .filter(
        (key) =>
          new Date(key) <= this.currentDate && new Date(key) >= this.startDate,
      )
      .reduce((cur, key) => {
        return Object.assign(cur, { [key]: companyStockData[key] });
      }, {});
  }
  async chooseStocks(chosenCompanies: { string: boolean }) {
    if (!chosenCompanies) throw new BadRequestException('Укажите компании');
    this.chosenCompanies = chosenCompanies;
    return this.chosenCompanies;
  }

  getStocksByDate(date: Date) {
    const dateString = StocksService.getDateString(date);
    const res = {};
    for (const company in this.stocksData) {
      if (!this.chosenCompanies[company]) continue;
      res[company] = this.stocksData[company][dateString];
    }
    return res;
  }

  startTrading(startDate: Date, delay: number) {
    clearInterval(this.tradingInterval);
    this.isTradingGoing = true;
    this.currentDate = startDate;
    this.startDate = startDate;
    if (this.tradingSubscription) this.tradingSubscription.unsubscribe();
    this.tradingInterval = setInterval(() => {
      this.currentDate = StocksService.addDays(this.currentDate.toString(), 1);
      this.currentData = {
        event: 'trading',
        data: {
          ...this.getStocksByDate(this.currentDate),
          currentDate: StocksService.getDateString(this.currentDate),
        },
      };
      this.eventEmitter.emit('trading', {
        ...this.currentData,
      });
    }, delay * 1000);
  }

  getTrading() {
    return this.currentData;
  }

  private processJson(fileContent: any, filename: string) {
    filename = filename.replace(/\.json$/, '');
    this.stocksData[filename] = fileContent;
  }

  buyStock(buyStockDto: SellBuyStockDto, id: string) {
    const user = this.userService.getUserById(id);
    if (!this.isTradingGoing) {
      throw new BadRequestException('Торги еще не начаты');
    }
    if (!this.getStocks(buyStockDto.companyName)) {
      throw new BadRequestException(
        'Акции такой компании не выставлены на торги',
      );
    }

    const stockPrice = this.getStocks(buyStockDto.companyName)[
      StocksService.getDateString(this.currentDate)
    ]?.Open;
    if (!stockPrice) {
      throw new BadRequestException('В эту дату торги не ведутся');
    }
    const cost = Number.parseFloat(stockPrice.slice(1)) * buyStockDto.amount;
    if (cost > user.balance) {
      throw new BadRequestException('Недостаточно средств');
    }
    this.userService.addStock(
      id,
      buyStockDto.companyName,
      buyStockDto.amount,
      cost,
    );
    return `Потрачено ${cost}`;
  }

  sellStock(sellStockDto: SellBuyStockDto, id: string) {
    const user = this.userService.getUserById(id);
    if (!this.isTradingGoing) {
      throw new BadRequestException('Торги еще не начаты');
    }
    if (!this.getStocks(sellStockDto.companyName)) {
      throw new BadRequestException(
        'Акции такой компании не выставлены на торги',
      );
    }
    const stockPrice = this.getStocks(sellStockDto.companyName)[
      StocksService.getDateString(this.currentDate)
    ]?.Open;
    if (!stockPrice) {
      throw new BadRequestException('В эту дату торги не ведутся');
    }
    if (
      !user.stocks[sellStockDto.companyName]?.amount ||
      user.stocks[sellStockDto.companyName]?.amount < sellStockDto.amount
    ) {
      throw new BadRequestException('Недостаточно акций');
    }
    const cost = Number.parseFloat(stockPrice.slice(1)) * sellStockDto.amount;

    this.userService.sellStock(
      id,
      sellStockDto.companyName,
      sellStockDto.amount,
      cost,
    );
    return `Получено ${cost}`;
  }
}
