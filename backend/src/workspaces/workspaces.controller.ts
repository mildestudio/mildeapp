import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspacesService } from './workspaces.service';

@ApiTags('Workspaces')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'A valid HttpOnly login cookie is required.' })
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
	constructor(private readonly workspaces: WorkspacesService) {}

	@ApiOperation({ summary: "List the authenticated user's workspaces" })
	@Get()
	list(@CurrentUser() user: AuthenticatedUser) {
		return this.workspaces.listForUser(user.id).then((rows) =>
			rows.map(({ role, workspace }) => ({ ...workspace, role })),
		);
	}

	@ApiOperation({ summary: "Read a workspace membership" })
	@Get(':workspaceId')
	get(@CurrentUser() user: AuthenticatedUser, @Param('workspaceId') workspaceId: string) {
		return this.workspaces.getForUser(user.id, workspaceId);
	}
}
