import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Body, Controller, Get, Param, Patch, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { RequestTaskRevisionDto } from './dto/request-task-revision.dto';
import { TaskCommentDto } from './dto/task-comment.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'A valid HttpOnly login cookie is required.' })
@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class ProjectTasksController {
	constructor(private readonly tasks: TasksService) {}

	@ApiOperation({ summary: 'List project tasks for the owner or assigned employee' })
	@Get()
	list(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
		return this.tasks.listForProject(user.id, projectId);
	}

	@ApiOperation({ summary: 'Create an internal employee task (workspace OWNER only)' })
	@Post()
	create(
		@CurrentUser() user: AuthenticatedUser,
		@Param('projectId') projectId: string,
		@Body() input: CreateTaskDto,
	) {
		return this.tasks.create(user.id, projectId, input);
	}
}

@ApiTags('Tasks')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'A valid HttpOnly login cookie is required.' })
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class TasksController {
	constructor(private readonly tasks: TasksService) {}

	@ApiOperation({ summary: 'List tasks assigned to the authenticated employee' })
	@Get('my-tasks')
	myTasks(@CurrentUser() user: AuthenticatedUser) {
		return this.tasks.myTasks(user.id);
	}

	@ApiOperation({ summary: 'List submitted tasks for workspaces owned by the authenticated user' })
	@Get('review-inbox')
	reviewInbox(@CurrentUser() user: AuthenticatedUser) {
		return this.tasks.reviewInbox(user.id);
	}

	@ApiOperation({ summary: 'Read a task and its activity history (owner or assigned employee)' })
	@Get(':taskId')
	get(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string) {
		return this.tasks.get(user.id, taskId);
	}

	@ApiOperation({ summary: 'Edit task metadata (workspace OWNER only)' })
	@Patch(':taskId')
	update(
		@CurrentUser() user: AuthenticatedUser,
		@Param('taskId') taskId: string,
		@Body() input: UpdateTaskDto,
	) {
		return this.tasks.update(user.id, taskId, input);
	}

	@ApiOperation({ summary: 'Start assigned work or resume a requested revision' })
	@Post(':taskId/start')
	start(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string) {
		return this.tasks.start(user.id, taskId);
	}

	@ApiOperation({ summary: 'Submit assigned work for owner review' })
	@Post(':taskId/submit')
	submit(
		@CurrentUser() user: AuthenticatedUser,
		@Param('taskId') taskId: string,
		@Body() input?: TaskCommentDto,
	) {
		return this.tasks.submit(user.id, taskId, input?.comment);
	}

	@ApiOperation({ summary: 'Request a revision (workspace OWNER only)' })
	@Post(':taskId/request-revision')
	requestRevision(
		@CurrentUser() user: AuthenticatedUser,
		@Param('taskId') taskId: string,
		@Body() input: RequestTaskRevisionDto,
	) {
		return this.tasks.requestRevision(user.id, taskId, input.reason);
	}

	@ApiOperation({ summary: 'Approve submitted work (workspace OWNER only)' })
	@Post(':taskId/approve')
	approve(
		@CurrentUser() user: AuthenticatedUser,
		@Param('taskId') taskId: string,
		@Body() input?: TaskCommentDto,
	) {
		return this.tasks.approve(user.id, taskId, input?.comment);
	}
}
