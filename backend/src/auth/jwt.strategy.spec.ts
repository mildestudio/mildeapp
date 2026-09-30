import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
	const findUnique = jest.fn();
	const strategy = new JwtStrategy(
		{ getOrThrow: () => 'test-secret' } as unknown as ConfigService,
		{ user: { findUnique } } as unknown as PrismaService,
	);

	beforeEach(() => findUnique.mockReset());

	it('loads the current account and role from Prisma', async () => {
		const user = {
			id: 'user-1',
			name: 'Test Owner',
			email: 'owner@milde.test',
			role: UserRole.OWNER,
		};
		findUnique.mockResolvedValue(user);

		await expect(strategy.validate({ sub: user.id })).resolves.toEqual(user);
		expect(findUnique).toHaveBeenCalledWith({
			where: { id: user.id },
			select: { id: true, name: true, email: true, role: true },
		});
	});

	it('rejects tokens for accounts that no longer exist', async () => {
		findUnique.mockResolvedValue(null);

		await expect(strategy.validate({ sub: 'deleted-user' })).rejects.toThrow(
			UnauthorizedException,
		);
	});

	it('rejects payloads without a subject', async () => {
		await expect(strategy.validate({ sub: '' })).rejects.toThrow(UnauthorizedException);
		expect(findUnique).not.toHaveBeenCalled();
	});
});
