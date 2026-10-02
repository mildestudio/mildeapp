import { ConflictException, ForbiddenException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { ProjectStatus, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
	const prisma = {
		project: {
			create: jest.fn(),
			findMany: jest.fn(),
			findUnique: jest.fn(),
			update: jest.fn(),
		},
		projectMember: { findUnique: jest.fn() },
	} as unknown as PrismaService;
	const workspaces = {
		getMembership: jest.fn(),
		requireWorkspaceRole: jest.fn(),
	} as unknown as WorkspacesService;
	const service = new ProjectsService(prisma, workspaces);

	beforeEach(() => jest.clearAllMocks());

	it('returns only assigned projects for non-owner workspace members', async () => {
		jest.mocked(workspaces.getMembership).mockResolvedValue({
			id: 'employee-membership',
			role: WorkspaceRole.EMPLOYEE,
		} as never);
		jest.mocked(prisma.project.findMany).mockResolvedValue([]);

		await expect(service.listForWorkspace('employee-id', 'workspace-id', {})).resolves.toEqual([]);
		expect(prisma.project.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					workspaceId: 'workspace-id',
					members: { some: { workspaceMemberId: 'employee-membership' } },
				},
			}),
		);
	});

	it.each([WorkspaceRole.EMPLOYEE, WorkspaceRole.CLIENT, WorkspaceRole.CONTRACTOR])(
		'limits %s project lists to projects assigned to that workspace membership',
		async (role) => {
			jest.mocked(workspaces.getMembership).mockResolvedValue({ id: `${role}-membership`, role } as never);
			jest.mocked(prisma.project.findMany).mockResolvedValue([]);

			await service.listForWorkspace('user-id', 'workspace-id', {});

			expect(prisma.project.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						workspaceId: 'workspace-id',
						members: { some: { workspaceMemberId: `${role}-membership` } },
					},
				}),
			);
		},
	);

	it('creates a draft project in the route workspace for an owner', async () => {
		jest.mocked(workspaces.requireWorkspaceRole).mockResolvedValue({} as never);
		jest.mocked(prisma.project.create).mockResolvedValue({
			id: 'project-id',
			workspaceId: 'workspace-id',
			name: 'Smith Residence',
			description: null,
			status: ProjectStatus.DRAFT,
			startDate: null,
			targetDate: null,
			createdAt: new Date('2026-10-01T00:00:00.000Z'),
			updatedAt: new Date('2026-10-01T00:00:00.000Z'),
			members: [],
		} as never);

		const result = await service.create('owner-id', 'workspace-id', { name: ' Smith Residence ' });

		expect(workspaces.requireWorkspaceRole).toHaveBeenCalledWith('owner-id', 'workspace-id', [WorkspaceRole.OWNER]);
		expect(prisma.project.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ workspaceId: 'workspace-id', name: 'Smith Residence' }),
			}),
		);
		expect(result.status).toBe(ProjectStatus.DRAFT);
	});

	it('does not restrict owners to assigned projects', async () => {
		jest.mocked(workspaces.getMembership).mockResolvedValue({
			id: 'owner-membership',
			role: WorkspaceRole.OWNER,
		} as never);
		jest.mocked(prisma.project.findMany).mockResolvedValue([]);

		await service.listForWorkspace('owner-id', 'workspace-id', { status: ProjectStatus.ACTIVE });
		expect(prisma.project.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { workspaceId: 'workspace-id', status: ProjectStatus.ACTIVE } }),
		);
	});

	it('denies a workspace member who is not assigned to the requested project', async () => {
		jest.mocked(prisma.project.findUnique).mockResolvedValue({
			id: 'project-id',
			workspaceId: 'workspace-id',
			status: ProjectStatus.ACTIVE,
			startDate: null,
			targetDate: null,
		} as never);
		jest.mocked(workspaces.getMembership).mockResolvedValue({
			id: 'employee-membership',
			role: WorkspaceRole.EMPLOYEE,
		} as never);
		jest.mocked(prisma.projectMember.findUnique).mockResolvedValue(null);

		await expect(service.getForUser('employee-id', 'project-id')).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('does not allow reopening an archived project', async () => {
		jest.mocked(prisma.project.findUnique).mockResolvedValue({
			id: 'project-id',
			workspaceId: 'workspace-id',
			status: ProjectStatus.ARCHIVED,
			startDate: null,
			targetDate: null,
		} as never);
		jest.mocked(workspaces.requireWorkspaceRole).mockResolvedValue({} as never);

		await expect(service.transition('owner-id', 'project-id', ProjectStatus.ACTIVE)).rejects.toBeInstanceOf(
			ConflictException,
		);
		expect(prisma.project.update).not.toHaveBeenCalled();
	});
});
