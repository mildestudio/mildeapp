import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';
import { ProjectMembersService } from './project-members.service';

describe('ProjectMembersService', () => {
	const prisma = {
		workspaceMember: { findUnique: jest.fn() },
		projectMember: { create: jest.fn(), delete: jest.fn(), findFirst: jest.fn() },
	} as unknown as PrismaService;
	const projects = { getOwnerProject: jest.fn() } as unknown as ProjectsService;
	const service = new ProjectMembersService(prisma, projects);

	beforeEach(() => jest.clearAllMocks());

	it('rejects assigning a user who is not a member of the project workspace', async () => {
		jest.mocked(projects.getOwnerProject).mockResolvedValue({
			id: 'project-id',
			workspaceId: 'workspace-id',
		} as never);
		jest.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);

		await expect(service.add('owner-id', 'project-id', { workspaceMemberId: 'outside-member' })).rejects.toBeInstanceOf(
			NotFoundException,
		);
		expect(prisma.projectMember.create).not.toHaveBeenCalled();
	});

	it('assigns an existing workspace member and derives their role from membership', async () => {
		jest.mocked(projects.getOwnerProject).mockResolvedValue({ id: 'project-id', workspaceId: 'workspace-id' } as never);
		jest.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
			id: 'membership-id',
			role: WorkspaceRole.CLIENT,
			user: { id: 'client-id', name: 'John Smith', email: 'john@example.test' },
		} as never);
		jest.mocked(prisma.projectMember.create).mockResolvedValue({
			id: 'project-member-id',
			createdAt: new Date('2026-10-01T00:00:00.000Z'),
		} as never);

		await expect(service.add('owner-id', 'project-id', { workspaceMemberId: 'membership-id' })).resolves.toMatchObject({
			id: 'project-member-id',
			role: WorkspaceRole.CLIENT,
			user: { id: 'client-id', name: 'John Smith' },
		});
		expect(prisma.projectMember.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { projectId: 'project-id', workspaceId: 'workspace-id', workspaceMemberId: 'membership-id' },
			}),
		);
	});

	it('returns conflict for a duplicate project member', async () => {
		jest.mocked(projects.getOwnerProject).mockResolvedValue({ id: 'project-id', workspaceId: 'workspace-id' } as never);
		jest.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
			id: 'membership-id',
			role: WorkspaceRole.EMPLOYEE,
			user: { id: 'employee-id', name: 'Alice', email: 'alice@example.test' },
		} as never);
		jest.mocked(prisma.projectMember.create).mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
				code: 'P2002',
				clientVersion: '7.10.0',
			}),
		);

		await expect(service.add('owner-id', 'project-id', { workspaceMemberId: 'membership-id' })).rejects.toBeInstanceOf(
			ConflictException,
		);
	});

	it('removes only the project member record', async () => {
		jest.mocked(projects.getOwnerProject).mockResolvedValue({ id: 'project-id', workspaceId: 'workspace-id' } as never);
		jest.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: 'project-member-id' } as never);
		jest.mocked(prisma.projectMember.delete).mockResolvedValue({} as never);

		await expect(service.remove('owner-id', 'project-id', 'project-member-id')).resolves.toEqual({ deleted: true });
		expect(prisma.projectMember.delete).toHaveBeenCalledWith({ where: { id: 'project-member-id' } });
	});
});
