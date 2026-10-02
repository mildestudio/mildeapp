import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWorkspaceMemberDto } from './dto/create-workspace-member.dto';
import { UpdateWorkspaceMemberDto } from './dto/update-workspace-member.dto';
import { WorkspaceMembersService } from './workspace-members.service';

@ApiTags('Workspace members')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'A valid HttpOnly login cookie is required.' })
@Controller('workspaces/:workspaceId/members')
@UseGuards(JwtAuthGuard)
export class WorkspaceMembersController {
	constructor(private readonly members: WorkspaceMembersService) {}

	@ApiOperation({ summary: "List workspace members (OWNER only)" })
	@Get()
	list(@CurrentUser() user: AuthenticatedUser, @Param('workspaceId') workspaceId: string) {
		return this.members.list(user.id, workspaceId);
	}

	@ApiOperation({ summary: "Add an existing user to the workspace (OWNER only)" })
	@Post()
	create(
		@CurrentUser() user: AuthenticatedUser,
		@Param('workspaceId') workspaceId: string,
		@Body() input: CreateWorkspaceMemberDto,
	) {
		return this.members.create(user.id, workspaceId, input);
	}

	@ApiOperation({ summary: "Change a workspace member role (OWNER only)" })
	@Patch(':memberId')
	update(
		@CurrentUser() user: AuthenticatedUser,
		@Param('workspaceId') workspaceId: string,
		@Param('memberId') memberId: string,
		@Body() input: UpdateWorkspaceMemberDto,
	) {
		return this.members.update(user.id, workspaceId, memberId, input);
	}

	@ApiOperation({ summary: "Remove a workspace membership (OWNER only)" })
	@Delete(':memberId')
	remove(
		@CurrentUser() user: AuthenticatedUser,
		@Param('workspaceId') workspaceId: string,
		@Param('memberId') memberId: string,
	) {
		return this.members.remove(user.id, workspaceId, memberId);
	}
}
