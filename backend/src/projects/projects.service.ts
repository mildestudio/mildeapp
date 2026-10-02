import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectStatus, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';

const projectSelect = {
	id: true,
	workspaceId: true,
	name: true,
	description: true,
	status: true,
	startDate: true,
	targetDate: true,
	createdAt: true,
	updatedAt: true,
	members: {
		select: {
			id: true,
			workspaceMemberId: true,
			createdAt: true,
			workspaceMember: {
				select: {
					role: true,
					user: { select: { id: true, name: true, email: true } },
				},
			},
		},
	},
} satisfies Prisma.ProjectSelect;

type SelectedProject = Prisma.ProjectGetPayload<{ select: typeof projectSelect }>;

@Injectable()
export class ProjectsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly workspaces: WorkspacesService,
	) {}

	async listForWorkspace(userId: string, workspaceId: string, query: ListProjectsQueryDto) {
		const membership = await this.workspaces.getMembership(userId, workspaceId);
		const assignedOnly = membership.role !== WorkspaceRole.OWNER;
		const projects = await this.prisma.project.findMany({
			where: {
				workspaceId,
				...(query.status ? { status: query.status } : {}),
				...(assignedOnly
					? { members: { some: { workspaceMemberId: membership.id } } }
					: {}),
			},
			select: projectSelect,
			orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
		});
		return projects.map((project) => this.toResponse(project));
	}

	async create(userId: string, workspaceId: string, input: CreateProjectDto) {
		await this.workspaces.requireWorkspaceRole(userId, workspaceId, [WorkspaceRole.OWNER]);
		const startDate = this.parseDate(input.startDate);
		const targetDate = this.parseDate(input.targetDate);
		this.validateDateRange(startDate, targetDate);
		const project = await this.prisma.project.create({
			data: {
				workspaceId,
				name: input.name.trim(),
				description: input.description?.trim() || null,
				startDate,
				targetDate,
			},
			select: projectSelect,
		});
		return this.toResponse(project);
	}

	async getForUser(userId: string, projectId: string) {
		const { project } = await this.requireProjectAccess(userId, projectId);
		const detailed = await this.prisma.project.findUnique({
			where: { id: project.id },
			select: projectSelect,
		});
		if (!detailed) throw new NotFoundException('Project not found');
		return this.toResponse(detailed);
	}

	async getOwnerProject(userId: string, projectId: string) {
		const project = await this.findProject(projectId);
		await this.workspaces.requireWorkspaceRole(userId, project.workspaceId, [WorkspaceRole.OWNER]);
		return project;
	}

	async requireProjectOwner(userId: string, projectId: string) {
		return this.getOwnerProject(userId, projectId);
	}

	async update(userId: string, projectId: string, input: UpdateProjectDto) {
		const current = await this.getOwnerProject(userId, projectId);
		const startDate = input.startDate === undefined ? current.startDate : this.parseDate(input.startDate);
		const targetDate = input.targetDate === undefined ? current.targetDate : this.parseDate(input.targetDate);
		this.validateDateRange(startDate, targetDate);
		const data: Prisma.ProjectUpdateInput = {
			...(input.name !== undefined ? { name: input.name.trim() } : {}),
			...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
			...(input.startDate !== undefined ? { startDate } : {}),
			...(input.targetDate !== undefined ? { targetDate } : {}),
		};
		const updated = await this.prisma.project.update({
			where: { id: projectId },
			data,
			select: projectSelect,
		});
		return this.toResponse(updated);
	}

	async transition(userId: string, projectId: string, target: ProjectStatus) {
		const project = await this.getOwnerProject(userId, projectId);
		const allowed = this.allowedTransitions[project.status];
		if (!allowed.includes(target)) {
			throw new ConflictException(`Project cannot move from ${project.status} to ${target}`);
		}
		const updated = await this.prisma.project.update({
			where: { id: projectId },
			data: { status: target },
			select: projectSelect,
		});
		return this.toResponse(updated);
	}

	async requireProjectAccess(userId: string, projectId: string) {
		const project = await this.findProject(projectId);
		const membership = await this.workspaces.getMembership(userId, project.workspaceId);
		if (membership.role === WorkspaceRole.OWNER) return { project, membership };

		const assignment = await this.prisma.projectMember.findUnique({
			where: {
				projectId_workspaceMemberId: { projectId, workspaceMemberId: membership.id },
			},
			select: { id: true },
		});
		if (!assignment) throw new ForbiddenException('You are not assigned to this project');
		return { project, membership };
	}

	private readonly allowedTransitions: Record<ProjectStatus, ProjectStatus[]> = {
		[ProjectStatus.DRAFT]: [ProjectStatus.ACTIVE],
		[ProjectStatus.ACTIVE]: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED],
		[ProjectStatus.ON_HOLD]: [ProjectStatus.ACTIVE, ProjectStatus.COMPLETED],
		[ProjectStatus.COMPLETED]: [ProjectStatus.ARCHIVED],
		[ProjectStatus.ARCHIVED]: [],
	};

	private async findProject(projectId: string) {
		const project = await this.prisma.project.findUnique({
			where: { id: projectId },
			select: {
				id: true,
				workspaceId: true,
				status: true,
				startDate: true,
				targetDate: true,
			},
		});
		if (!project) throw new NotFoundException('Project not found');
		return project;
	}

	private parseDate(value: string | null | undefined): Date | null {
		return value ? new Date(value) : null;
	}

	private validateDateRange(startDate: Date | null, targetDate: Date | null): void {
		if (startDate && targetDate && targetDate < startDate) {
			throw new BadRequestException('Target date must be on or after the start date');
		}
	}

	private toResponse(project: SelectedProject) {
		return {
			id: project.id,
			workspaceId: project.workspaceId,
			name: project.name,
			description: project.description,
			status: project.status,
			startDate: project.startDate,
			targetDate: project.targetDate,
			createdAt: project.createdAt,
			updatedAt: project.updatedAt,
			members: project.members.map((member) => ({
				id: member.id,
				workspaceMemberId: member.workspaceMemberId,
				role: member.workspaceMember.role,
				createdAt: member.createdAt,
				user: member.workspaceMember.user,
			})),
		};
	}
}
