import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';
import { ProjectMembersService } from './project-members.service';

describe('ProjectMembersService', () => {
	const prisma = {
		workspaceMember: { findUnique: jest.fn() },
		projectMember: { create: jest.fn() },
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

		await expect(service.add('owner-id', 'project-id', { userId: 'outside-user' })).rejects.toBeInstanceOf(
			NotFoundException,
		);
		expect(prisma.projectMember.create).not.toHaveBeenCalled();
	});
});
