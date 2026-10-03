import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { TaskActivityType, TaskPriority, TaskStatus, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
	const prisma = {
		task: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
		taskActivity: { create: jest.fn() },
		projectMember: { findFirst: jest.fn() },
		workspaceMember: { findMany: jest.fn(), findUnique: jest.fn() },
		$transaction: jest.fn(),
	} as unknown as PrismaService;
	const projects = { requireProjectOwner: jest.fn(), requireProjectAccess: jest.fn() } as unknown as ProjectsService;
	const workspaces = { getMembership: jest.fn(), requireWorkspaceRole: jest.fn() } as unknown as WorkspacesService;
	const tx = {
		task: { create: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), updateMany: jest.fn() },
		taskActivity: { create: jest.fn() },
		workspaceMember: { findUnique: jest.fn() },
	};
	const service = new TasksService(prisma, projects, workspaces);

	const task = (overrides: Record<string, unknown> = {}) => ({
		id: 'task-a',
		projectId: 'project-a',
		workspaceId: 'workspace-a',
		title: 'Kitchen render',
		description: null,
		status: TaskStatus.TODO,
		priority: TaskPriority.HIGH,
		dueDate: null,
		createdAt: new Date('2026-10-03T08:00:00Z'),
		updatedAt: new Date('2026-10-03T08:00:00Z'),
		project: { id: 'project-a', name: 'Smith Residence' },
		assignee: { id: 'employee-membership', user: { id: 'employee-a', name: 'Alice' } },
		assigneeProjectMember: { id: 'project-member-a' },
		createdBy: { id: 'owner-membership', user: { id: 'owner-a', name: 'Gavin' } },
		activities: [],
		...overrides,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(prisma.$transaction).mockImplementation(async (callback: never) => callback(tx) as never);
	});

	it('creates a TODO task and CREATED activity atomically for a project employee', async () => {
		jest.mocked(projects.requireProjectOwner).mockResolvedValue({ id: 'project-a', workspaceId: 'workspace-a' } as never);
		jest.mocked(workspaces.getMembership).mockResolvedValue({ id: 'owner-membership' } as never);
		jest.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: 'project-member-a', workspaceMemberId: 'employee-membership' } as never);
		tx.task.create.mockResolvedValue(task() as never);

		const result = await service.create('owner-a', 'project-a', {
			title: ' Kitchen render ',
			assigneeId: 'project-member-a',
			priority: TaskPriority.HIGH,
			dueDate: null,
		});

		expect(tx.task.create).toHaveBeenCalledWith(expect.objectContaining({
			data: expect.objectContaining({
				title: 'Kitchen render',
				assigneeRole: WorkspaceRole.EMPLOYEE,
				createdByWorkspaceMemberId: 'owner-membership',
			}),
		}));
		expect(tx.taskActivity.create).toHaveBeenCalledWith(expect.objectContaining({
			data: expect.objectContaining({ type: TaskActivityType.CREATED, actorWorkspaceMemberId: 'owner-membership' }),
		}));
		expect(result.status).toBe(TaskStatus.TODO);
	});

	it('rejects an assignee who is not an employee project member', async () => {
		jest.mocked(projects.requireProjectOwner).mockResolvedValue({ id: 'project-a', workspaceId: 'workspace-a' } as never);
		jest.mocked(workspaces.getMembership).mockResolvedValue({ id: 'owner-membership' } as never);
		jest.mocked(prisma.projectMember.findFirst).mockResolvedValue(null);

		await expect(service.create('owner-a', 'project-a', { title: 'Task', assigneeId: 'client-project-member' })).rejects.toBeInstanceOf(BadRequestException);
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it('filters project task lists to the assigned employee membership', async () => {
		jest.mocked(projects.requireProjectAccess).mockResolvedValue({
			project: { id: 'project-a', workspaceId: 'workspace-a' },
			membership: { id: 'employee-membership', role: WorkspaceRole.EMPLOYEE },
		} as never);
		jest.mocked(prisma.task.findMany).mockResolvedValue([]);

		await service.listForProject('employee-a', 'project-a');
		expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
			where: expect.objectContaining({ assigneeWorkspaceMemberId: 'employee-membership' }),
		}));
	});

	it('does not disclose another employee task', async () => {
		jest.mocked(prisma.task.findUnique).mockResolvedValue(task() as never);
		jest.mocked(workspaces.getMembership).mockResolvedValue({ id: 'employee-b-membership', role: WorkspaceRole.EMPLOYEE } as never);

		await expect(service.get('employee-b', 'task-a')).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('rejects an invalid TODO to APPROVED transition without writing activity', async () => {
		tx.task.findUnique.mockResolvedValue({ id: 'task-a', workspaceId: 'workspace-a', status: TaskStatus.TODO, assigneeWorkspaceMemberId: 'employee-membership' } as never);
		tx.workspaceMember.findUnique.mockResolvedValue({ id: 'owner-membership', role: WorkspaceRole.OWNER } as never);

		await expect(service.approve('owner-a', 'task-a')).rejects.toBeInstanceOf(ConflictException);
		expect(tx.task.updateMany).not.toHaveBeenCalled();
		expect(tx.taskActivity.create).not.toHaveBeenCalled();
	});

	it('forbids an employee from invoking owner approval', async () => {
		tx.task.findUnique.mockResolvedValue({ id: 'task-a', workspaceId: 'workspace-a', status: TaskStatus.SUBMITTED, assigneeWorkspaceMemberId: 'employee-membership' } as never);
		tx.workspaceMember.findUnique.mockResolvedValue({ id: 'employee-membership', role: WorkspaceRole.EMPLOYEE } as never);

		await expect(service.approve('employee-a', 'task-a')).rejects.toBeInstanceOf(ForbiddenException);
		expect(tx.task.updateMany).not.toHaveBeenCalled();
	});

	it('records a successful resubmission with its status update in the same transaction', async () => {
		tx.task.findUnique.mockResolvedValue({ id: 'task-a', workspaceId: 'workspace-a', status: TaskStatus.IN_PROGRESS, assigneeWorkspaceMemberId: 'employee-membership' } as never);
		tx.workspaceMember.findUnique.mockResolvedValue({ id: 'employee-membership', role: WorkspaceRole.EMPLOYEE } as never);
		tx.task.updateMany.mockResolvedValue({ count: 1 } as never);
		tx.task.findUniqueOrThrow.mockResolvedValue(task({ status: TaskStatus.SUBMITTED, activities: [{ id: 'activity-a', type: TaskActivityType.SUBMITTED, comment: 'Ready', createdAt: new Date(), actor: { id: 'employee-membership', user: { id: 'employee-a', name: 'Alice' } } }] }) as never);

		const result = await service.submit('employee-a', 'task-a', ' Ready ');

		expect(tx.task.updateMany).toHaveBeenCalledWith(expect.objectContaining({
			where: { id: 'task-a', workspaceId: 'workspace-a', status: TaskStatus.IN_PROGRESS },
			data: { status: TaskStatus.SUBMITTED },
		}));
		expect(tx.taskActivity.create).toHaveBeenCalledWith(expect.objectContaining({
			data: expect.objectContaining({ type: TaskActivityType.SUBMITTED, comment: 'Ready' }),
		}));
		expect(result.status).toBe(TaskStatus.SUBMITTED);
	});

	it('detects a concurrent state transition and writes no contradictory activity', async () => {
		tx.task.findUnique.mockResolvedValue({ id: 'task-a', workspaceId: 'workspace-a', status: TaskStatus.SUBMITTED, assigneeWorkspaceMemberId: 'employee-membership' } as never);
		tx.workspaceMember.findUnique.mockResolvedValue({ id: 'owner-membership', role: WorkspaceRole.OWNER } as never);
		tx.task.updateMany.mockResolvedValue({ count: 0 } as never);

		await expect(service.approve('owner-a', 'task-a')).rejects.toBeInstanceOf(ConflictException);
		expect(tx.taskActivity.create).not.toHaveBeenCalled();
	});
});
