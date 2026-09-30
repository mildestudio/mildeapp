import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
	constructor(private readonly workspaces: WorkspacesService) {}

	@Get()
	list(@CurrentUser() user: AuthenticatedUser) {
		return this.workspaces.listForUser(user.id).then((rows) =>
			rows.map(({ role, workspace }) => ({ ...workspace, role })),
		);
	}

	@Get(':workspaceId')
	get(@CurrentUser() user: AuthenticatedUser, @Param('workspaceId') workspaceId: string) {
		return this.workspaces.getForUser(user.id, workspaceId);
	}
}
