import { apiRequest } from '$lib/api';
import type {
	CreateProjectInput,
	ProjectMember,
	ProjectStatus,
	ProjectSummary,
	UpdateProjectInput
} from './types';

export function listProjects(token: string, workspaceId: string): Promise<ProjectSummary[]> {
	return apiRequest<ProjectSummary[]>(`/workspaces/${workspaceId}/projects`, { token });
}

export function getProject(token: string, projectId: string): Promise<ProjectSummary> {
	return apiRequest<ProjectSummary>(`/projects/${projectId}`, { token });
}

export function createProject(
	token: string,
	workspaceId: string,
	body: CreateProjectInput
): Promise<ProjectSummary> {
	return apiRequest<ProjectSummary>(`/workspaces/${workspaceId}/projects`, {
		method: 'POST',
		token,
		body
	});
}

export function updateProject(
	token: string,
	projectId: string,
	body: UpdateProjectInput
): Promise<ProjectSummary> {
	return apiRequest<ProjectSummary>(`/projects/${projectId}`, { method: 'PATCH', token, body });
}

export function changeProjectStatus(
	token: string,
	projectId: string,
	action: 'activate' | 'hold' | 'complete' | 'archive'
): Promise<ProjectSummary> {
	return apiRequest<ProjectSummary>(`/projects/${projectId}/${action}`, { method: 'POST', token });
}

export function addProjectMember(
	token: string,
	projectId: string,
	userId: string
): Promise<ProjectMember> {
	return apiRequest<ProjectMember>(`/projects/${projectId}/members`, {
		method: 'POST',
		token,
		body: { userId }
	});
}

export function removeProjectMember(
	token: string,
	projectId: string,
	memberId: string
): Promise<{ deleted: boolean }> {
	return apiRequest<{ deleted: boolean }>(`/projects/${projectId}/members/${memberId}`, {
		method: 'DELETE',
		token
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
