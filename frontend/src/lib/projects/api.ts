import { apiRequest } from '$lib/api';
import type {
	CreateProjectInput,
	ProjectMember,
	ProjectStatus,
	ProjectSummary,
	UpdateProjectInput
} from './types';

export function listProjects(workspaceId: string): Promise<ProjectSummary[]> {
	return apiRequest<ProjectSummary[]>(`/workspaces/${workspaceId}/projects`);
}

export function getProject(projectId: string): Promise<ProjectSummary> {
	return apiRequest<ProjectSummary>(`/projects/${projectId}`);
}

export function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
	return apiRequest<ProjectMember[]>(`/projects/${projectId}/members`);
}

export function createProject(
	workspaceId: string,
	body: CreateProjectInput
): Promise<ProjectSummary> {
	return apiRequest<ProjectSummary>(`/workspaces/${workspaceId}/projects`, {
		method: 'POST',
		body
	});
}

export function updateProject(
	projectId: string,
	body: UpdateProjectInput
): Promise<ProjectSummary> {
	return apiRequest<ProjectSummary>(`/projects/${projectId}`, { method: 'PATCH', body });
}

export function changeProjectStatus(
	projectId: string,
	action: 'activate' | 'hold' | 'complete' | 'archive'
): Promise<ProjectSummary> {
	return apiRequest<ProjectSummary>(`/projects/${projectId}/${action}`, { method: 'POST' });
}

export function addProjectMember(
	projectId: string,
	workspaceMemberId: string
): Promise<ProjectMember> {
	return apiRequest<ProjectMember>(`/projects/${projectId}/members`, {
		method: 'POST',
		body: { workspaceMemberId }
	});
}

export function removeProjectMember(
	projectId: string,
	memberId: string
): Promise<{ deleted: boolean }> {
	return apiRequest<{ deleted: boolean }>(`/projects/${projectId}/members/${memberId}`, {
		method: 'DELETE',
	});
}

export function projectStatusLabel(status: ProjectStatus): string {
	return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatProjectDate(value: string | null): string {
	if (!value) return 'Not set';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Not set';
	return new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(date);
}
