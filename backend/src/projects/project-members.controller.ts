import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { ProjectMembersService } from './project-members.service';

@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard)
export class ProjectMembersController {
	constructor(private readonly members: ProjectMembersService) {}

	@Get()
	list(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
		return this.members.list(user.id, projectId);
	}

	@Post()
	add(
		@CurrentUser() user: AuthenticatedUser,
		@Param('projectId') projectId: string,
		@Body() input: AddProjectMemberDto,
	) {
		return this.members.add(user.id, projectId, input);
	}

	@Delete(':memberId')
	remove(
		@CurrentUser() user: AuthenticatedUser,
		@Param('projectId') projectId: string,
		@Param('memberId') memberId: string,
	) {
		return this.members.remove(user.id, projectId, memberId);
	}
}
