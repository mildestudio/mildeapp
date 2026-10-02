import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
	constructor(private readonly projects: ProjectsService) {}

	@Get(':projectId')
	get(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
		return this.projects.getForUser(user.id, projectId);
	}

	@Patch(':projectId')
	update(
		@CurrentUser() user: AuthenticatedUser,
		@Param('projectId') projectId: string,
		@Body() input: UpdateProjectDto,
	) {
		return this.projects.update(user.id, projectId, input);
	}

	@Post(':projectId/activate')
	activate(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
		return this.projects.transition(user.id, projectId, ProjectStatus.ACTIVE);
	}

	@Post(':projectId/hold')
	hold(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
		return this.projects.transition(user.id, projectId, ProjectStatus.ON_HOLD);
	}

	@Post(':projectId/complete')
	complete(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
		return this.projects.transition(user.id, projectId, ProjectStatus.COMPLETED);
	}

	@Post(':projectId/archive')
	archive(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
		return this.projects.transition(user.id, projectId, ProjectStatus.ARCHIVED);
	}
}
