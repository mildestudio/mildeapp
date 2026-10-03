import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskActivityType, TaskPriority, TaskStatus, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { UpdateTaskDto } from './dto/update-task.dto';

const taskSelect = {
	id: true,
	projectId: true,
	workspaceId: true,
	title: true,
	description: true,
	status: true,
	priority: true,
	dueDate: true,
	createdAt: true,
	updatedAt: true,
	project: { select: { id: true, name: true } },
	assignee: { select: { id: true, user: { select: { id: true, name: true } } } },
	assigneeProjectMember: { select: { id: true } },
	createdBy: { select: { id: true, user: { select: { id: true, name: true } } } },
	activities: {
		orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
		select: {
			id: true,
			type: true,
			comment: true,
			createdAt: true,
			actor: { select: { id: true, user: { select: { id: true, name: true } } } },
		},
	},
} satisfies Prisma.TaskSelect;

const taskSummarySelect = {
	id: true,
	projectId: true,
	title: true,
	description: true,
	status: true,
	priority: true,
	dueDate: true,
	createdAt: true,
	updatedAt: true,
	project: { select: { id: true, name: true } },
	assignee: { select: { id: true, user: { select: { id: true, name: true } } } },
	activities: {
		where: { type: TaskActivityType.SUBMITTED },
		orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
		take: 1,
		select: { createdAt: true, actor: { select: { user: { select: { name: true } } } } },
	},
} satisfies Prisma.TaskSelect;

type TaskPayload = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;
type TaskSummaryPayload = Prisma.TaskGetPayload<{ select: typeof taskSummarySelect }>;

@Injectable()
export class TasksService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly projects: ProjectsService,
		private readonly workspaces: WorkspacesService,
	) {}

	async create(userId: string, projectId: string, input: CreateTaskDto) {
		const project = await this.projects.requireProjectOwner(userId, projectId);
		const creator = await this.workspaces.getMembership(userId, project.workspaceId);
		const assignee = await this.prisma.projectMember.findFirst({
			where: {
				id: input.assigneeId,
				projectId,
				workspaceId: project.workspaceId,
				workspaceMember: { role: WorkspaceRole.EMPLOYEE },
			},
			select: { id: true, workspaceMemberId: true },
		});
		if (!assignee) {
			throw new BadRequestException('Assignee must be an EMPLOYEE assigned to this project');
		}

		return this.prisma.$transaction(async (tx) => {
			const task = await tx.task.create({
				data: {
					projectId,
					workspaceId: project.workspaceId,
					assigneeProjectMemberId: assignee.id,
					assigneeWorkspaceMemberId: assignee.workspaceMemberId,
					assigneeRole: WorkspaceRole.EMPLOYEE,
					createdByWorkspaceMemberId: creator.id,
					title: input.title.trim(),
					description: input.description?.trim() || null,
					priority: input.priority ?? TaskPriority.MEDIUM,
					dueDate: this.parseDate(input.dueDate),
				},
				select: taskSelect,
			});
			await tx.taskActivity.create({
				data: {
					taskId: task.id,
					workspaceId: project.workspaceId,
					actorWorkspaceMemberId: creator.id,
					type: TaskActivityType.CREATED,
				},
			});
			return this.toTask(task, WorkspaceRole.OWNER);
		});
	}

	async listForProject(userId: string, projectId: string) {
		const { project, membership } = await this.projects.requireProjectAccess(userId, projectId);
		if (membership.role !== WorkspaceRole.OWNER && membership.role !== WorkspaceRole.EMPLOYEE) {
			throw new ForbiddenException('Internal project tasks are not available to this workspace role');
		}
		const rows = await this.prisma.task.findMany({
			where: {
				projectId,
				workspaceId: project.workspaceId,
				...(membership.role === WorkspaceRole.EMPLOYEE
					? { assigneeWorkspaceMemberId: membership.id }
					: {}),
			},
			select: taskSummarySelect,
			orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
		});
		return rows.map((task) => this.toSummary(task));
	}

	async myTasks(userId: string) {
		const memberships = await this.prisma.workspaceMember.findMany({
			where: { userId, role: WorkspaceRole.EMPLOYEE },
			select: { id: true },
		});
		if (memberships.length === 0) throw new ForbiddenException('Employee task access is not available to this workspace role');
		const rows = await this.prisma.task.findMany({
			where: { assigneeWorkspaceMemberId: { in: memberships.map(({ id }) => id) } },
			select: taskSummarySelect,
			orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
		});
		return rows.map((task) => this.toSummary(task));
	}

	async reviewInbox(userId: string) {
		const memberships = await this.prisma.workspaceMember.findMany({
			where: { userId, role: WorkspaceRole.OWNER },
			select: { id: true, workspaceId: true },
		});
		if (memberships.length === 0) throw new ForbiddenException('Only workspace owners can review tasks');
		const rows = await this.prisma.task.findMany({
			where: {
				status: TaskStatus.SUBMITTED,
				workspaceId: { in: memberships.map(({ workspaceId }) => workspaceId) },
			},
			select: taskSummarySelect,
			orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
		});
		return rows.map((task) => this.toSummary(task));
	}

	async get(userId: string, taskId: string) {
		const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: taskSelect });
		if (!task) throw new NotFoundException('Task not found');
		const membership = await this.workspaces.getMembership(userId, task.workspaceId);
		this.assertTaskReadAccess(membership, task.assignee.id);
		return this.toTask(task, membership.role);
	}

	async update(userId: string, taskId: string, input: UpdateTaskDto) {
		const task = await this.requireOwnerTask(userId, taskId);
		if (Object.keys(input).length === 0) throw new BadRequestException('Provide at least one task field to update');

		let reassignment: { id: string; workspaceMemberId: string } | undefined;
		if (input.assigneeId !== undefined) {
			reassignment = (await this.prisma.projectMember.findFirst({
				where: {
					id: input.assigneeId,
					projectId: task.projectId,
					workspaceId: task.workspaceId,
					workspaceMember: { role: WorkspaceRole.EMPLOYEE },
				},
				select: { id: true, workspaceMemberId: true },
			})) ?? undefined;
			if (!reassignment) {
				throw new BadRequestException('Assignee must be an EMPLOYEE assigned to this project');
			}
		}

		const updated = await this.prisma.task.update({
			where: { id: taskId },
			data: {
				...(input.title !== undefined ? { title: input.title.trim() } : {}),
				...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
				...(input.priority !== undefined ? { priority: input.priority } : {}),
				...(input.dueDate !== undefined ? { dueDate: this.parseDate(input.dueDate) } : {}),
				...(reassignment
					? {
						assigneeProjectMemberId: reassignment.id,
						assigneeWorkspaceMemberId: reassignment.workspaceMemberId,
						assigneeRole: WorkspaceRole.EMPLOYEE,
					}
					: {}),
			},
			select: taskSelect,
		});
		return this.toTask(updated, WorkspaceRole.OWNER);
	}

	start(userId: string, taskId: string) {
		return this.transition(userId, taskId, 'EMPLOYEE', [TaskStatus.TODO, TaskStatus.REVISION_REQUESTED], TaskStatus.IN_PROGRESS, TaskActivityType.STARTED);
	}

	submit(userId: string, taskId: string, comment?: string) {
		return this.transition(userId, taskId, 'EMPLOYEE', [TaskStatus.IN_PROGRESS], TaskStatus.SUBMITTED, TaskActivityType.SUBMITTED, comment?.trim() || null);
	}

	requestRevision(userId: string, taskId: string, reason: string) {
		return this.transition(userId, taskId, 'OWNER', [TaskStatus.SUBMITTED], TaskStatus.REVISION_REQUESTED, TaskActivityType.REVISION_REQUESTED, reason.trim());
	}

	approve(userId: string, taskId: string, comment?: string) {
		return this.transition(userId, taskId, 'OWNER', [TaskStatus.SUBMITTED], TaskStatus.APPROVED, TaskActivityType.APPROVED, comment?.trim() || null);
	}

	private async transition(
		userId: string,
		taskId: string,
		actorType: 'OWNER' | 'EMPLOYEE',
		from: TaskStatus[],
		to: TaskStatus,
		activityType: TaskActivityType,
		comment: string | null = null,
	) {
		return this.prisma.$transaction(async (tx) => {
			const task = await tx.task.findUnique({
				where: { id: taskId },
				select: { id: true, workspaceId: true, status: true, assigneeWorkspaceMemberId: true },
			});
			if (!task) throw new NotFoundException('Task not found');

			const actor = await tx.workspaceMember.findUnique({
				where: { workspaceId_userId: { workspaceId: task.workspaceId, userId } },
				select: { id: true, role: true },
			});
			if (!actor) throw new ForbiddenException('You cannot access this task');
			if (actorType === 'OWNER') {
				if (actor.role !== WorkspaceRole.OWNER) throw new ForbiddenException('Only a workspace owner can review tasks');
			} else if (actor.role !== WorkspaceRole.EMPLOYEE || actor.id !== task.assigneeWorkspaceMemberId) {
				throw new ForbiddenException('Only the assigned employee can perform this task action');
			}

			if (!from.includes(task.status)) {
				throw new ConflictException(`Task cannot move from ${task.status} to ${to}`);
			}
			const changed = await tx.task.updateMany({
				where: { id: taskId, workspaceId: task.workspaceId, status: task.status },
				data: { status: to },
			});
			if (changed.count !== 1) throw new ConflictException('Task status changed; reload and try again');

			await tx.taskActivity.create({
				data: {
					taskId,
					workspaceId: task.workspaceId,
					actorWorkspaceMemberId: actor.id,
					type: activityType,
					comment,
				},
			});

			const updated = await tx.task.findUniqueOrThrow({ where: { id: taskId }, select: taskSelect });
			return this.toTask(updated, actor.role);
		});
	}

	private async requireOwnerTask(userId: string, taskId: string) {
		const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { id: true, projectId: true, workspaceId: true } });
		if (!task) throw new NotFoundException('Task not found');
		await this.workspaces.requireWorkspaceRole(userId, task.workspaceId, [WorkspaceRole.OWNER]);
		return task;
	}

	private assertTaskReadAccess(membership: { id: string; role: WorkspaceRole }, assigneeId: string) {
		if (membership.role === WorkspaceRole.OWNER) return;
		if (membership.role === WorkspaceRole.EMPLOYEE && membership.id === assigneeId) return;
		throw new ForbiddenException('You cannot access this task');
	}

	private parseDate(value?: string | null): Date | null {
		return value ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : null;
	}

	private toTask(task: TaskPayload, viewerRole: WorkspaceRole) {
		return {
			id: task.id,
			projectId: task.projectId,
			project: task.project,
			title: task.title,
			description: task.description,
			status: task.status,
			priority: task.priority,
			dueDate: task.dueDate,
			createdAt: task.createdAt,
			updatedAt: task.updatedAt,
			viewerRole,
			assignee: { workspaceMemberId: task.assignee.id, user: task.assignee.user },
			assigneeProjectMemberId: task.assigneeProjectMember.id,
			createdBy: { workspaceMemberId: task.createdBy.id, user: task.createdBy.user },
			activities: task.activities.map((activity) => ({
				id: activity.id,
				type: activity.type,
				comment: activity.comment,
				createdAt: activity.createdAt,
				actor: { name: activity.actor.user.name },
			})),
		};
	}

	private toSummary(task: TaskSummaryPayload) {
		const submission = task.activities[0];
		return {
			id: task.id,
			projectId: task.projectId,
			project: task.project,
			title: task.title,
			description: task.description,
			status: task.status,
			priority: task.priority,
			dueDate: task.dueDate,
			createdAt: task.createdAt,
			updatedAt: task.updatedAt,
			assignee: { workspaceMemberId: task.assignee.id, name: task.assignee.user.name },
			submittedAt: submission?.createdAt ?? null,
			submittedBy: submission?.actor.user.name ?? null,
		};
	}
}
