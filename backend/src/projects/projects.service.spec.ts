import { ConflictException, ForbiddenException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { ProjectStatus, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
	const prisma = {
		project: {
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
