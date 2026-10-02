import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'A valid HttpOnly login cookie is required.' })
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
	constructor(private readonly projects: ProjectsService) {}

	@ApiOperation({ summary: "Read a project (owner or assigned member)" })
	@Get(':projectId')
	get(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
		return this.projects.getForUser(user.id, projectId);
	}

	@ApiOperation({ summary: "Edit project metadata (workspace OWNER only)" })
	@Patch(':projectId')
	update(
		@CurrentUser() user: AuthenticatedUser,
		@Param('projectId') projectId: string,
		@Body() input: UpdateProjectDto,
	) {
		return this.projects.update(user.id, projectId, input);
	}

	@ApiOperation({ summary: "Activate a DRAFT or ON_HOLD project (OWNER only)" })
	@Post(':projectId/activate')
	activate(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
		return this.projects.transition(user.id, projectId, ProjectStatus.ACTIVE);
	}

	@ApiOperation({ summary: "Put an ACTIVE project on hold (OWNER only)" })
	@Post(':projectId/hold')
	hold(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
		return this.projects.transition(user.id, projectId, ProjectStatus.ON_HOLD);
	}

	@ApiOperation({ summary: "Complete an ACTIVE or ON_HOLD project (OWNER only)" })
	@Post(':projectId/complete')
	complete(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
		return this.projects.transition(user.id, projectId, ProjectStatus.COMPLETED);
	}

	@ApiOperation({ summary: "Archive a COMPLETED project (OWNER only)" })
	@Post(':projectId/archive')
	archive(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
		return this.projects.transition(user.id, projectId, ProjectStatus.ARCHIVED);
	}
}
