import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
	constructor(private readonly prisma: PrismaService) {}

	listForUser(userId: string) {
		return this.prisma.workspaceMember.findMany({
			where: { userId },
			select: {
				role: true,
				workspace: { select: { id: true, name: true, slug: true } },
			},
			orderBy: { createdAt: 'asc' },
		});
	}

	async getForUser(userId: string, workspaceId: string) {
		const membership = await this.getMembership(userId, workspaceId);
		return {
			id: membership.workspace.id,
			name: membership.workspace.name,
			slug: membership.workspace.slug,
			membership: { role: membership.role },
		};
	}

	async getMembership(userId: string, workspaceId: string) {
		const membership = await this.prisma.workspaceMember.findUnique({
			where: { workspaceId_userId: { workspaceId, userId } },
			include: { workspace: true },
		});

		if (!membership) throw new NotFoundException('Workspace not found');
		return membership;
	}

	async requireWorkspaceRole(userId: string, workspaceId: string, roles: WorkspaceRole[]) {
		const membership = await this.getMembership(userId, workspaceId);
		if (!roles.includes(membership.role)) {
			throw new ForbiddenException('Your workspace role cannot perform this action');
		}
		return membership;
	}
}
