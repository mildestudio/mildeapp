import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser, JwtPayload } from './authenticated-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		config: ConfigService,
		private readonly prisma: PrismaService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
