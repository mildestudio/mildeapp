import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';
import type { AddProjectMemberDto } from './dto/add-project-member.dto';

@Injectable()
export class ProjectMembersService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly projects: ProjectsService,
	) {}

	async list(userId: string, projectId: string) {
		const project = await this.projects.getForUser(userId, projectId);
		return project.members;
	}

	async add(userId: string, projectId: string, input: AddProjectMemberDto) {
		const project = await this.projects.getOwnerProject(userId, projectId);
		const workspaceMember = await this.prisma.workspaceMember.findUnique({
			where: {
				workspaceId_userId: { workspaceId: project.workspaceId, userId: input.userId },
			},
			select: { id: true, role: true, user: { select: { id: true, name: true, email: true } } },
		});
		if (!workspaceMember) throw new NotFoundException('User is not a member of this workspace');

		try {
			const member = await this.prisma.projectMember.create({
				data: {
					projectId,
					workspaceId: project.workspaceId,
					workspaceMemberId: workspaceMember.id,
				},
				select: { id: true, createdAt: true },
			});
			return {
				...member,
				role: workspaceMember.role,
				user: workspaceMember.user,
			};
		} catch (error: unknown) {
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
				throw new ConflictException('This workspace member is already assigned to the project');
			}
			throw error;
		}
	}

	async remove(userId: string, projectId: string, memberId: string) {
		await this.projects.getOwnerProject(userId, projectId);
		const member = await this.prisma.projectMember.findFirst({
			where: { id: memberId, projectId },
			select: { id: true },
		});
		if (!member) throw new NotFoundException('Project member not found');
		await this.prisma.projectMember.delete({ where: { id: member.id } });
		return { deleted: true };
	}
}
