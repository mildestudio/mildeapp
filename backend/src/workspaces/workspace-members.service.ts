import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from './workspaces.service';
import type { CreateWorkspaceMemberDto } from './dto/create-workspace-member.dto';
import type { UpdateWorkspaceMemberDto } from './dto/update-workspace-member.dto';

@Injectable()
export class WorkspaceMembersService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly workspaces: WorkspacesService,
	) {}

	async list(userId: string, workspaceId: string) {
		await this.workspaces.requireWorkspaceRole(userId, workspaceId, [WorkspaceRole.OWNER]);
		return this.prisma.workspaceMember.findMany({
			where: { workspaceId },
			select: {
				id: true,
				role: true,
				createdAt: true,
				user: { select: { id: true, name: true, email: true } },
			},
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
		});
	}

	async create(userId: string, workspaceId: string, input: CreateWorkspaceMemberDto) {
		await this.workspaces.requireWorkspaceRole(userId, workspaceId, [WorkspaceRole.OWNER]);
		const user = await this.prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } });
		if (!user) throw new NotFoundException('User not found');

		try {
			return await this.prisma.workspaceMember.create({
				data: { workspaceId, userId: user.id, role: input.role },
				select: {
					id: true,
					role: true,
					createdAt: true,
					user: { select: { id: true, name: true, email: true } },
				},
			});
		} catch (error: unknown) {
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
				throw new ConflictException('This user is already a member of the workspace');
			}
			throw error;
		}
	}

	async update(
		userId: string,
		workspaceId: string,
		memberId: string,
		input: UpdateWorkspaceMemberDto,
	) {
		await this.workspaces.requireWorkspaceRole(userId, workspaceId, [WorkspaceRole.OWNER]);
		const member = await this.findMember(workspaceId, memberId);
		if (member.role === WorkspaceRole.EMPLOYEE && input.role !== WorkspaceRole.EMPLOYEE) {
			const assignedTasks = await this.prisma.task.count({
				where: { assigneeWorkspaceMemberId: member.id },
			});
			if (assignedTasks > 0) {
				throw new ConflictException('Reassign this employee’s tasks before changing their workspace role');
			}
		}
		if (member.role === WorkspaceRole.OWNER && input.role !== WorkspaceRole.OWNER) {
			await this.ensureAnotherOwnerExists(workspaceId);
		}

		return this.prisma.workspaceMember.update({
			where: { id: member.id },
			data: { role: input.role },
			select: {
				id: true,
				role: true,
				createdAt: true,
				user: { select: { id: true, name: true, email: true } },
			},
		});
	}

	async remove(userId: string, workspaceId: string, memberId: string) {
		await this.workspaces.requireWorkspaceRole(userId, workspaceId, [WorkspaceRole.OWNER]);
		const member = await this.findMember(workspaceId, memberId);
		if (member.role === WorkspaceRole.OWNER) await this.ensureAnotherOwnerExists(workspaceId);
		const protectedTasks = await this.prisma.task.count({
			where: {
				workspaceId,
				OR: [
					{ assigneeWorkspaceMemberId: member.id },
					{ createdByWorkspaceMemberId: member.id },
					{ activities: { some: { actorWorkspaceMemberId: member.id } } },
				],
			},
		});
		if (protectedTasks > 0) {
			throw new ConflictException('This member has task assignments or audit history and cannot be removed');
		}
		await this.prisma.workspaceMember.delete({ where: { id: member.id } });
		return { deleted: true };
	}

	private async findMember(workspaceId: string, memberId: string) {
		const member = await this.prisma.workspaceMember.findFirst({
			where: { id: memberId, workspaceId },
			select: { id: true, role: true },
		});
		if (!member) throw new NotFoundException('Workspace member not found');
		return member;
	}

	private async ensureAnotherOwnerExists(workspaceId: string) {
		const ownerCount = await this.prisma.workspaceMember.count({
			where: { workspaceId, role: WorkspaceRole.OWNER },
		});
		if (ownerCount <= 1) {
			throw new BadRequestException('A workspace must keep at least one owner');
		}
	}
}
