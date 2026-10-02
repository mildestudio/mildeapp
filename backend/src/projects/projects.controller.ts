import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { ProjectsService } from './projects.service';

@Controller('workspaces/:workspaceId/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
	constructor(private readonly projects: ProjectsService) {}

	@Get()
	list(
		@CurrentUser() user: AuthenticatedUser,
		@Param('workspaceId') workspaceId: string,
		@Query() query: ListProjectsQueryDto,
	) {
		return this.projects.listForWorkspace(user.id, workspaceId, query);
	}

	@Post()
	create(
		@CurrentUser() user: AuthenticatedUser,
		@Param('workspaceId') workspaceId: string,
		@Body() input: CreateProjectDto,
	) {
		return this.projects.create(user.id, workspaceId, input);
	}
}
