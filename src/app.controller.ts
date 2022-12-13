import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';

import { AppService } from './app.service';
import { LocalAuthGuard } from './auth/guards/local-auth.guard';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { Roles } from './common/decorators/roles.decorator';
import { Role } from './common/enums/role.enum';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req) {
    return {
      token: await this.authService.login(req.user),
      userId: req.user.id,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  @Get('auth/test-admin')
  testAuthAdmin(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.User)
  @Get('auth/test-client')
  testAuthClient(@Request() req) {
    return req.user;
  }
}
