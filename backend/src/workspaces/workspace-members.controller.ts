import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWorkspaceMemberDto } from './dto/create-workspace-member.dto';
import { UpdateWorkspaceMemberDto } from './dto/update-workspace-member.dto';
import { WorkspaceMembersService } from './workspace-members.service';

@Controller('workspaces/:workspaceId/members')
@UseGuards(JwtAuthGuard)
export class WorkspaceMembersController {
	constructor(private readonly members: WorkspaceMembersService) {}

	@Get()
	list(@CurrentUser() user: AuthenticatedUser, @Param('workspaceId') workspaceId: string) {
		return this.members.list(user.id, workspaceId);
	}

	@Post()
	create(
		@CurrentUser() user: AuthenticatedUser,
		@Param('workspaceId') workspaceId: string,
		@Body() input: CreateWorkspaceMemberDto,
	) {
		return this.members.create(user.id, workspaceId, input);
	}

	@Patch(':memberId')
	update(
		@CurrentUser() user: AuthenticatedUser,
		@Param('workspaceId') workspaceId: string,
		@Param('memberId') memberId: string,
		@Body() input: UpdateWorkspaceMemberDto,
	) {
		return this.members.update(user.id, workspaceId, memberId, input);
	}

	@Delete(':memberId')
	remove(
		@CurrentUser() user: AuthenticatedUser,
		@Param('workspaceId') workspaceId: string,
		@Param('memberId') memberId: string,
	) {
		return this.members.remove(user.id, workspaceId, memberId);
	}
}
