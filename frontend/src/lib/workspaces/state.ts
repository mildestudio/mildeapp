import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';
import { apiRequest } from '$lib/api';
import type { WorkspaceSummary } from './types';

const ACTIVE_WORKSPACE_KEY = 'milde.activeWorkspaceId';

export const workspaces = writable<WorkspaceSummary[]>([]);
export const activeWorkspace = writable<WorkspaceSummary | null>(null);

export async function loadWorkspaces(token: string): Promise<WorkspaceSummary | null> {
	const available = await apiRequest<WorkspaceSummary[]>('/workspaces', { token });
	workspaces.set(available);

	const savedId = browser ? localStorage.getItem(ACTIVE_WORKSPACE_KEY) : null;
	const selected = available.find((workspace) => workspace.id === savedId) ?? available[0] ?? null;
	activeWorkspace.set(selected);

	if (browser) {
		if (selected) localStorage.setItem(ACTIVE_WORKSPACE_KEY, selected.id);
		else localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
	}
	return selected;
}

export function selectWorkspace(workspaceId: string): void {
	const selected = get(workspaces).find((workspace) => workspace.id === workspaceId);
	if (!selected) return;
	activeWorkspace.set(selected);
	if (browser) localStorage.setItem(ACTIVE_WORKSPACE_KEY, selected.id);
}
