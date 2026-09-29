import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { jest } from '@jest/globals';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
	const getAllAndOverride = jest.fn();
	const guard = new RolesGuard({ getAllAndOverride } as unknown as Reflector);

	function contextFor(role?: UserRole): ExecutionContext {
		return {
			getHandler: () => jest.fn(),
			getClass: () => class TestController {},
			switchToHttp: () => ({
				getRequest: () => ({ user: role ? { role } : undefined }),
			}),
		} as unknown as ExecutionContext;
	}

	beforeEach(() => getAllAndOverride.mockReset());

	it('allows an account with a required role', () => {
		getAllAndOverride.mockReturnValue([UserRole.OWNER]);

		expect(guard.canActivate(contextFor(UserRole.OWNER))).toBe(true);
	});

	it('rejects an account with the wrong role', () => {
		getAllAndOverride.mockReturnValue([UserRole.OWNER]);

		expect(() => guard.canActivate(contextFor(UserRole.CLIENT))).toThrow(ForbiddenException);
	});

	it('allows routes without role metadata', () => {
		getAllAndOverride.mockReturnValue(undefined);

		expect(guard.canActivate(contextFor())).toBe(true);
	});
});
