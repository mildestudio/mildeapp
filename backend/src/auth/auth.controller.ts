import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedUser } from './authenticated-user';

const AUTH_COOKIE_NAME = 'milde_access_token';
const AUTH_COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1',
    maxAge: 24 * 60 * 60 * 1000,
};

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ) { }

    @Post('register')
    @ApiOperation({ summary: 'Register an account (defaults to CLIENT)' })
    register(
        @Body() dto: RegisterDto,
    ) {
        return this.authService.register(dto);
    }

    @Post('login')
    @ApiOperation({ summary: 'Sign in and set the HttpOnly session cookie', description: 'Execute this first. The browser stores milde_access_token automatically; the response contains the user profile, not the JWT.' })
    login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) response: Response,
    ) {
        return this.authService.login(dto).then(({ accessToken, user }) => {
            response.cookie(AUTH_COOKIE_NAME, accessToken, AUTH_COOKIE_OPTIONS);
            return { user };
        });
    }

    @Post('logout')
    @ApiOperation({ summary: 'Clear the HttpOnly session cookie' })
    logout(@Res({ passthrough: true }) response: Response) {
        response.clearCookie(AUTH_COOKIE_NAME, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/v1',
        });
        return { loggedOut: true };
    }

    @Get('me')
    @ApiOperation({ summary: 'Read the authenticated user profile' })
    @ApiCookieAuth('cookieAuth')
    @ApiUnauthorizedResponse({ description: 'A valid HttpOnly login cookie is required.' })
    @UseGuards(JwtAuthGuard)
    me(@CurrentUser() user: AuthenticatedUser) {
        return user;
    }
}
