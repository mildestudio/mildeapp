import type { UserRole } from '$lib/auth/types';

export type WorkspaceRole = UserRole;

export interface WorkspaceSummary {
	id: string;
	name: string;
	slug: string;
	role: WorkspaceRole;
}

export interface WorkspaceMember {
	id: string;
	role: WorkspaceRole;
	createdAt: string;
	user: {
		id: string;
		name: string;
		email: string;
	};
}
