import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { readdir, readFile } from 'fs';
import * as path from 'path';
import { interval, Observable, share, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { Socket } from 'socket.io';
@Injectable()
export class StocksService implements OnModuleInit {
  private tradingSubscription: Subscription;
  private currentData: any;
  private tradingInterval: any;
  private currentDate: Date;
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
    return `${('0' + date.getMonth() + 1).slice(-2)}/${(
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
  private trading: Observable<{ data: Record<string, unknown>; event: string }>;
  constructor() {
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

  async getStocks(companyName: string) {
    return this.stocksData[companyName];
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
    console.log(dateString, res);
    return res;
  }

  startTrading(startDate: Date, delay: number) {
    clearInterval(this.tradingInterval);
    this.currentDate = startDate;
    if (this.tradingSubscription) this.tradingSubscription.unsubscribe();
    this.tradingInterval = setInterval(() => {
      this.currentDate = StocksService.addDays(this.currentDate.toString(), 1);
      this.currentData = {
        event: 'trading',
        data: this.getStocksByDate(this.currentDate),
      };
    }, delay * 1000);
  }

  getTrading(client: Socket) {
    return this.currentData;
  }

  private processJson(fileContent: any, filename: string) {
    filename = filename.replace(/\.json$/, '');
    this.stocksData[filename] = fileContent;
  }
}
