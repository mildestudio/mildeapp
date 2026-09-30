import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService', () => {
	const prisma = {
		workspaceMember: {
			findMany: jest.fn(),
			findUnique: jest.fn(),
		},
	} as unknown as PrismaService;
	const service = new WorkspacesService(prisma);

	beforeEach(() => jest.clearAllMocks());

	it('lists only membership rows for the authenticated user', async () => {
		const rows = [{ role: WorkspaceRole.EMPLOYEE, workspace: { id: 'workspace-a', name: 'Milde', slug: 'milde' } }];
		const findMany = jest.mocked(prisma.workspaceMember.findMany);
		findMany.mockResolvedValue(rows as never);

		await expect(service.listForUser('user-a')).resolves.toEqual(rows);
		expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-a' } }));
	});

	it('does not allow a user to open a workspace without a matching membership', async () => {
		const findUnique = jest.mocked(prisma.workspaceMember.findUnique);
		findUnique.mockResolvedValue(null);

		await expect(service.getForUser('user-a', 'workspace-b')).rejects.toBeInstanceOf(NotFoundException);
		expect(findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { workspaceId_userId: { workspaceId: 'workspace-b', userId: 'user-a' } },
			}),
		);
	});

	it('uses the role on this workspace membership for owner authorization', async () => {
		const findUnique = jest.mocked(prisma.workspaceMember.findUnique);
		findUnique.mockResolvedValue({ role: WorkspaceRole.EMPLOYEE } as never);

		await expect(
			service.requireWorkspaceRole('user-a', 'workspace-a', [WorkspaceRole.OWNER]),
		).rejects.toBeInstanceOf(ForbiddenException);
	});
});
