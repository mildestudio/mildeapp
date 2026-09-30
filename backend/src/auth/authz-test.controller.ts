import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { AuthenticatedUser } from './authenticated-user';

@Controller('auth/test')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthzTestController {
	@Get('owner')
	@Roles(UserRole.OWNER)
	owner(@CurrentUser() user: AuthenticatedUser) {
		return { message: 'OWNER access granted', user };
	}

	@Get('employee')
	@Roles(UserRole.EMPLOYEE)
	employee(@CurrentUser() user: AuthenticatedUser) {
		return { message: 'EMPLOYEE access granted', user };
	}

	@Get('client')
	@Roles(UserRole.CLIENT)
	client(@CurrentUser() user: AuthenticatedUser) {
		return { message: 'CLIENT access granted', user };
	}

	@Get('contractor')
	@Roles(UserRole.CONTRACTOR)
	contractor(@CurrentUser() user: AuthenticatedUser) {
		return { message: 'CONTRACTOR access granted', user };
	}
}
