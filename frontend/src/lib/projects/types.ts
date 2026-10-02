import type { WorkspaceRole } from '$lib/workspaces/types';

export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';

export interface ProjectMember {
	id: string;
	role: WorkspaceRole;
	createdAt: string;
	user: {
		id: string;
		name: string;
		email: string;
	};
}

export interface ProjectSummary {
	id: string;
	workspaceId: string;
	name: string;
	description: string | null;
	status: ProjectStatus;
	startDate: string | null;
	targetDate: string | null;
	createdAt: string;
	updatedAt: string;
	members: ProjectMember[];
}

export interface CreateProjectInput {
	name: string;
	description: string | null;
	startDate: string | null;
	targetDate: string | null;
}

export type UpdateProjectInput = Partial<CreateProjectInput>;
