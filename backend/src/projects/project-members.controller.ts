import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { ProjectMembersService } from './project-members.service';

@ApiTags('Project members')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'A valid HttpOnly login cookie is required.' })
@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard)
export class ProjectMembersController {
	constructor(private readonly members: ProjectMembersService) {}

	@ApiOperation({ summary: "Read assigned project members and their workspace roles" })
	@Get()
	list(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
		return this.members.list(user.id, projectId);
	}

	@ApiOperation({ summary: "Assign an existing workspace member (OWNER only; duplicate returns 409)" })
	@Post()
	add(
		@CurrentUser() user: AuthenticatedUser,
		@Param('projectId') projectId: string,
		@Body() input: AddProjectMemberDto,
	) {
		return this.members.add(user.id, projectId, input);
	}

	@ApiOperation({ summary: "Remove a project assignment (OWNER only; workspace membership remains)" })
	@Delete(':memberId')
	remove(
		@CurrentUser() user: AuthenticatedUser,
		@Param('projectId') projectId: string,
		@Param('memberId') memberId: string,
	) {
		return this.members.remove(user.id, projectId, memberId);
	}
}
