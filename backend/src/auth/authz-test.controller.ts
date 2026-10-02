import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { AuthenticatedUser } from './authenticated-user';

@ApiTags('Role checks')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'A valid HttpOnly login cookie is required.' })
@Controller('auth/test')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthzTestController {
	@Get('owner')
	@Roles(UserRole.OWNER)
	@ApiOperation({ summary: 'Check global OWNER account role' })
	owner(@CurrentUser() user: AuthenticatedUser) {
		return { message: 'OWNER access granted', user };
	}

	@Get('employee')
	@Roles(UserRole.EMPLOYEE)
	@ApiOperation({ summary: 'Check global EMPLOYEE account role' })
	employee(@CurrentUser() user: AuthenticatedUser) {
		return { message: 'EMPLOYEE access granted', user };
	}

	@Get('client')
	@Roles(UserRole.CLIENT)
	@ApiOperation({ summary: 'Check global CLIENT account role' })
	client(@CurrentUser() user: AuthenticatedUser) {
		return { message: 'CLIENT access granted', user };
	}

	@Get('contractor')
	@Roles(UserRole.CONTRACTOR)
	@ApiOperation({ summary: 'Check global CONTRACTOR account role' })
	contractor(@CurrentUser() user: AuthenticatedUser) {
		return { message: 'CONTRACTOR access granted', user };
	}
}
