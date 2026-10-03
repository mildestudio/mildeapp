import { apiRequest } from '$lib/api';
import type { CreateTaskInput, TaskDetail, TaskSummary, UpdateTaskInput } from './types';

export function listProjectTasks(projectId: string): Promise<TaskSummary[]> {
	return apiRequest<TaskSummary[]>(`/projects/${projectId}/tasks`);
}

export function createTask(projectId: string, input: CreateTaskInput): Promise<TaskDetail> {
	return apiRequest<TaskDetail>(`/projects/${projectId}/tasks`, { method: 'POST', body: input });
}

export function listMyTasks(): Promise<TaskSummary[]> {
	return apiRequest<TaskSummary[]>('/tasks/my-tasks');
}

export function listReviewInbox(): Promise<TaskSummary[]> {
	return apiRequest<TaskSummary[]>('/tasks/review-inbox');
}

export function getTask(taskId: string): Promise<TaskDetail> {
	return apiRequest<TaskDetail>(`/tasks/${taskId}`);
}

export function updateTask(taskId: string, input: UpdateTaskInput): Promise<TaskDetail> {
	return apiRequest<TaskDetail>(`/tasks/${taskId}`, { method: 'PATCH', body: input });
}

export function startTask(taskId: string): Promise<TaskDetail> {
	return apiRequest<TaskDetail>(`/tasks/${taskId}/start`, { method: 'POST' });
}

export function submitTask(taskId: string, comment?: string): Promise<TaskDetail> {
	return apiRequest<TaskDetail>(`/tasks/${taskId}/submit`, { method: 'POST', body: { comment } });
}

export function requestTaskRevision(taskId: string, reason: string): Promise<TaskDetail> {
	return apiRequest<TaskDetail>(`/tasks/${taskId}/request-revision`, { method: 'POST', body: { reason } });
}

export function approveTask(taskId: string, comment?: string): Promise<TaskDetail> {
	return apiRequest<TaskDetail>(`/tasks/${taskId}/approve`, { method: 'POST', body: { comment } });
}

export function taskStatusLabel(status: string): string {
	return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatTaskDueDate(value: string | null): string {
	if (!value) return 'No due date';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'No due date';
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const due = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
	if (days === 0) return 'Due today';
	if (days === 1) return 'Due tomorrow';
	if (days === -1) return 'Overdue by 1 day';
	if (days < -1) return `Overdue by ${Math.abs(days)} days`;
	return `Due ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(due)}`;
}
