<script lang="ts">
	import { onMount } from 'svelte';
	import { apiRequest, ApiError } from '$lib/api';
	import { getAccessToken, getUser, logout, redirectByRole } from '$lib/auth/session';
	import { loadWorkspaces } from '$lib/workspaces/state';
	import type { WorkspaceSummary, WorkspaceMember, WorkspaceRole } from '$lib/workspaces/types';

	const roles: WorkspaceRole[] = ['OWNER', 'EMPLOYEE', 'CLIENT', 'CONTRACTOR'];
	let workspace = $state<WorkspaceSummary | null>(null);
	let members = $state<WorkspaceMember[]>([]);
	let ready = $state(false);
	let busyMemberId = $state<string | null>(null);
	let error = $state('');
	let notice = $state('');

	onMount(async () => {
		const token = getAccessToken();
		const user = getUser();
		if (!token || !user) {
			window.location.replace('/login');
			return;
		}

		try {
			workspace = await loadWorkspaces(token);
			if (!workspace) {
				error = 'This account is not a member of a workspace.';
				return;
			}
			if (workspace.role !== 'OWNER') {
				await redirectByRole(workspace.role);
				return;
			}
			await refreshMembers(token, workspace.id);
		} catch (cause: unknown) {
			error = cause instanceof Error ? cause.message : 'Team access could not be loaded.';
		} finally {
			ready = true;
		}
	});

	async function refreshMembers(token: string, workspaceId: string): Promise<void> {
		members = await apiRequest<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`, { token });
	}

	async function changeRole(member: WorkspaceMember, nextRole: string): Promise<void> {
		if (!workspace || !roles.includes(nextRole as WorkspaceRole) || nextRole === member.role) return;
		const token = getAccessToken();
		if (!token) {
			await logout();
			return;
		}

		busyMemberId = member.id;
		error = '';
		notice = '';
		try {
			const updated = await apiRequest<WorkspaceMember>(
				`/workspaces/${workspace.id}/members/${member.id}`,
				{ method: 'PATCH', token, body: { role: nextRole } }
			);
			members = members.map((row) => (row.id === updated.id ? updated : row));
			notice = `${member.user.name}'s workspace role is now ${updated.role}.`;
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'The role could not be changed.';
		} finally {
			busyMemberId = null;
		}
	}

	async function removeMember(member: WorkspaceMember): Promise<void> {
		if (!workspace || !window.confirm(`Remove ${member.user.name} from ${workspace.name}?`)) return;
		const token = getAccessToken();
		if (!token) {
			await logout();
			return;
		}

		busyMemberId = member.id;
		error = '';
		notice = '';
		try {
			await apiRequest<{ deleted: boolean }>(`/workspaces/${workspace.id}/members/${member.id}`, {
				method: 'DELETE',
				token
			});
			members = members.filter((row) => row.id !== member.id);
			notice = `${member.user.name} was removed from the workspace.`;
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'The member could not be removed.';
		} finally {
			busyMemberId = null;
		}
	}
</script>

<svelte:head>
	<title>Team &amp; Access · Milde Project Space</title>
	<meta name="description" content="Manage workspace roles and access for Milde." />
</svelte:head>

<main class="members-page">
	<header class="page-header">
		<a class="brand" href="/owner" aria-label="Milde Control Center">
			<span class="brand-mark" aria-hidden="true">M</span>
			<span class="brand-name">Milde <span>Project Space</span></span>
		</a>
		<div class="header-actions">
			<a href="/owner">Control Center</a>
			<button type="button" onclick={() => void logout()}>Log out</button>
		</div>
	</header>

	{#if !ready}
		<p class="state" role="status">Loading workspace access…</p>
	{:else if error && !workspace}
		<p class="state error" role="alert">{error}</p>
	{:else if workspace}
		<section class="content">
			<a class="back-link" href="/owner">← Control Center</a>
			<p class="eyebrow">{workspace.name}</p>
			<h1>Team &amp; Access</h1>
			<p class="intro">People in this workspace and the role assigned to each one.</p>

			{#if error}
				<p class="feedback error" role="alert">{error}</p>
			{/if}
			{#if notice}
				<p class="feedback success" role="status">{notice}</p>
			{/if}

			<div class="member-list" aria-label="Workspace members">
				{#each members as member (member.id)}
					<article class="member-row">
						<div class="member-avatar" aria-hidden="true">{member.user.name.trim().charAt(0).toUpperCase()}</div>
						<div class="member-identity">
							<strong>{member.user.name}</strong>
							<span>{member.user.email}</span>
						</div>
						<label class="role-control">
							<span>Workspace role</span>
							<select
								aria-label={`Role for ${member.user.name}`}
								value={member.role}
								disabled={busyMemberId === member.id}
								onchange={(event) => void changeRole(member, event.currentTarget.value)}
							>
								{#each roles as role}
									<option value={role}>{role}</option>
								{/each}
							</select>
						</label>
						<button
							class="remove-button"
							type="button"
							disabled={busyMemberId === member.id}
							onclick={() => void removeMember(member)}
						>Remove</button>
					</article>
				{:else}
					<p class="empty-state">No members have been added to this workspace.</p>
				{/each}
			</div>
		</section>
	{/if}
</main>

<style>
	.members-page {
		min-height: 100svh;
		padding: 0 clamp(18px, 6vw, 84px) 72px;
		background: #f6f4ee;
		color: #292e28;
	}

	.page-header {
		display: flex;
		min-height: 78px;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		border-bottom: 1px solid #deddd3;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		color: inherit;
		text-decoration: none;
	}

	.brand-mark {
		display: grid;
		width: 36px;
		aspect-ratio: 1;
		place-items: center;
		border: 1px solid #53604f;
		color: #344332;
		font-family: Georgia, serif;
		font-size: 19px;
	}

	.brand-name {
		display: grid;
		font-size: 14px;
		font-weight: 650;
		letter-spacing: -0.03em;
		line-height: 1.1;
	}

	.brand-name span {
		margin-top: 4px;
		color: #696c61;
		font-size: 9px;
		font-weight: 500;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.header-actions a,
	.header-actions button {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
		padding: 0 12px;
		border: 1px solid #cbcbbf;
		background: transparent;
		color: #343a32;
		font: inherit;
		font-size: 13px;
		text-decoration: none;
		cursor: pointer;
	}

	.header-actions a:hover,
	.header-actions button:hover,
	.remove-button:hover {
		background: #eeece4;
	}

	.content {
		width: min(100%, 900px);
		margin: clamp(44px, 8vh, 82px) auto 0;
	}

	.back-link {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
		margin-bottom: 32px;
		color: #53604f;
		font-size: 13px;
		text-underline-offset: 4px;
	}

	.eyebrow {
		margin: 0 0 13px;
		color: #6a715f;
		font-size: 11px;
		font-weight: 650;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(38px, 6vw, 58px);
		font-weight: 400;
		letter-spacing: -0.045em;
		line-height: 1.05;
	}

	.intro {
		margin: 15px 0 32px;
		color: #62665d;
		font-size: 14px;
		line-height: 1.6;
	}

	.member-list {
		border-top: 1px solid #d9d7cd;
	}

	.member-row {
		display: grid;
		grid-template-columns: 42px minmax(150px, 1fr) minmax(148px, 190px) 84px;
		align-items: center;
		gap: 18px;
		min-height: 94px;
		padding: 14px 10px;
		border-bottom: 1px solid #d9d7cd;
	}

	.member-avatar {
		display: grid;
		width: 42px;
		aspect-ratio: 1;
		place-items: center;
		background: #e8e7dc;
		color: #43513d;
		font-family: Georgia, serif;
		font-size: 19px;
	}

	.member-identity {
		display: grid;
		min-width: 0;
		gap: 5px;
	}

	.member-identity strong {
		font-size: 14px;
		font-weight: 600;
	}

	.member-identity span {
		overflow-wrap: anywhere;
		color: #64675f;
		font-size: 12px;
	}

	.role-control {
		display: grid;
		gap: 5px;
		color: #63675e;
		font-size: 10px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.role-control select {
		min-height: 44px;
		width: 100%;
		padding: 0 10px;
		border: 1px solid #b9b9ad;
		border-radius: 0;
		background: #fffefa;
		color: #344332;
		font: inherit;
		font-size: 12px;
		letter-spacing: 0.04em;
	}

	.remove-button {
		min-height: 44px;
		border: 1px solid #cbcbbf;
		background: transparent;
		color: #743c34;
		font: inherit;
		font-size: 12px;
		cursor: pointer;
	}

	.remove-button:disabled,
	.role-control select:disabled {
		cursor: wait;
		opacity: 0.58;
	}

	.feedback,
	.state,
	.empty-state {
		padding: 14px 16px;
		border: 1px solid #d9d7cd;
		background: #fffefa;
		font-size: 13px;
		line-height: 1.55;
	}

	.feedback { margin: 0 0 15px; }
	.error { color: #7b332c; }
	.success { color: #344d36; }
	.state { width: min(100% - 36px, 560px); margin: 15vh auto 0; }
	.empty-state { color: #62665d; }

	:global(:focus-visible) {
		outline: 3px solid #52604b;
		outline-offset: 3px;
	}

	@media (max-width: 720px) {
		.member-row {
			grid-template-columns: 42px minmax(0, 1fr) auto;
			gap: 12px;
			padding: 16px 4px;
		}

		.member-identity { grid-column: 2 / -1; }
		.role-control { grid-column: 1 / 3; }
		.remove-button { grid-column: 3; grid-row: 2; min-width: 80px; }
	}

	@media (max-width: 460px) {
		.members-page { padding-right: 16px; padding-left: 16px; }
		.page-header { min-height: 70px; }
		.brand { gap: 8px; }
		.header-actions { gap: 6px; }
		.header-actions a, .header-actions button { padding: 0 8px; font-size: 11px; }
		.content { margin-top: 34px; }
	}
</style>
