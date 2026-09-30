import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceMembersService } from './workspace-members.service';

describe('WorkspaceMembersService', () => {
	const prisma = {
		workspaceMember: {
			findFirst: jest.fn(),
			count: jest.fn(),
			delete: jest.fn(),
		},
	} as unknown as PrismaService;
	const workspaces = {
		requireWorkspaceRole: jest.fn(),
	} as unknown as WorkspacesService;
	const service = new WorkspaceMembersService(prisma, workspaces);

	beforeEach(() => jest.clearAllMocks());

	it('rejects deleting the final owner and leaves the membership in place', async () => {
		jest.mocked(workspaces.requireWorkspaceRole).mockResolvedValue({} as never);
		jest.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
			id: 'owner-membership',
			role: WorkspaceRole.OWNER,
		} as never);
		jest.mocked(prisma.workspaceMember.count).mockResolvedValue(1);

		await expect(service.remove('owner-user', 'workspace-a', 'owner-membership')).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(prisma.workspaceMember.delete).not.toHaveBeenCalled();
	});
});
