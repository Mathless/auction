import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import { readFile, writeFile } from 'fs';
import { find, findKey } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../common/entities/user.entity';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService implements OnModuleInit {
  private users: User[];

  constructor() {}

  async onModuleInit() {
    await this.initializeData();
  }

  addStock(userId: string, companyName: string, amount: number, cost: number) {
    this.users[userId].balance -= cost;
    this.users[userId].stocks[companyName] = {
      amount: this.users[userId].stocks[companyName]?.amount + amount,
      cost: this.users[userId].stocks[companyName]?.cost + cost,
    };
    this.saveUsers();
  }
  async findOne(username: string): Promise<User | undefined> {
    const user = find(this.users, (user) => user.username === username);
    user['id'] = findKey(this.users, user);
    return user;
  }

  async addUser(newUser: User) {
    if (find(this.users, (user) => user.username === newUser.username)) {
      throw new BadRequestException('Пользователь с таким username уже есть');
    }
    const id = uuidv4();
    newUser.roles = [Role.User];
    newUser.stocks = {};
    this.users[id] = newUser;
    this.saveUsers();
    return { id };
  }

  async deleteUser(id: string) {
    if (!this.users[id]) {
      throw new BadRequestException('Пользователя с таким id нет');
    }
    if (this.users[id].roles.includes(Role.Admin)) {
      throw new BadRequestException(
        'Пользователя с ролью администратор нельзя удалить',
      );
    }
    delete this.users[id];
    this.saveUsers();
  }

  private async initializeData() {
    const fullFilename = path.join(__dirname, 'json', 'users.json');
    readFile(fullFilename, { encoding: 'utf-8' }, (err, data) => {
      try {
        this.users = JSON.parse(data);
      } catch (err) {
        console.error(`error while parsing file: ${fullFilename}`);
      }
    });
  }

  private saveUsers() {
    const fullFilename = path.join(__dirname, 'json', 'users.json');

    writeFile(fullFilename, JSON.stringify(this.users), function (err) {
      if (err) {
        console.log(err);
      }
    });
  }

  getUsers() {
    return this.users;
  }

  getUserById(id: string) {
    const user = this.users[id];
    delete user['password'];
    return user;
  }

  sellStock(userId: string, companyName: string, amount, cost: number) {
    this.users[userId].balance += cost;
    this.users[userId].stocks[companyName] = {
      amount: this.users[userId].stocks[companyName]?.amount - amount,
      cost: this.users[userId].stocks[companyName]?.cost - cost,
    };
    this.saveUsers();
  }
}
