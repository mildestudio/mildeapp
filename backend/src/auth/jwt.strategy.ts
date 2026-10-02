import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser, JwtPayload } from './authenticated-user';

const AUTH_COOKIE_NAME = 'milde_access_token';

function cookieExtractor(request: Request): string | null {
	const cookieHeader = request.headers.cookie;
	if (!cookieHeader) return null;

	for (const cookie of cookieHeader.split(';')) {
		const separator = cookie.indexOf('=');
		if (separator < 0 || cookie.slice(0, separator).trim() !== AUTH_COOKIE_NAME) continue;
		return cookie.slice(separator + 1).trim();
	}
	return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		config: ConfigService,
		private readonly prisma: PrismaService,
	) {
		super({
			jwtFromRequest: cookieExtractor,
			ignoreExpiration: false,
			secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
		});
	}

	async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
		if (typeof payload?.sub !== 'string' || payload.sub.length === 0) {
			throw new UnauthorizedException();
		}

		const user = await this.prisma.user.findUnique({
			where: { id: payload.sub },
			select: { id: true, name: true, email: true, role: true },
		});

		if (!user) throw new UnauthorizedException();
		return user;
	}
}
