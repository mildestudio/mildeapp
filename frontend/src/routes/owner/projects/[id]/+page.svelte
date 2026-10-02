<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types';
	import { get } from 'svelte/store';
	import { ApiError, apiRequest } from '$lib/api';
	import { getAccessToken, getUser, logout, redirectByRole } from '$lib/auth/session';
	import WorkspaceSwitcher from '$lib/components/WorkspaceSwitcher.svelte';
	import {
		addProjectMember,
		changeProjectStatus,
		formatProjectDate,
		getProject,
		projectStatusLabel,
		removeProjectMember,
		updateProject
	} from '$lib/projects/api';
	import type { ProjectMember, ProjectStatus, ProjectSummary, UpdateProjectInput } from '$lib/projects/types';
	import { loadWorkspaces, selectWorkspace, workspaces } from '$lib/workspaces/state';
	import type { WorkspaceMember, WorkspaceSummary } from '$lib/workspaces/types';

	let { params }: PageProps = $props();
	let workspace = $state<WorkspaceSummary | null>(null);
	let availableWorkspaces = $state<WorkspaceSummary[]>([]);
	let project = $state<ProjectSummary | null>(null);
	let workspaceMembers = $state<WorkspaceMember[]>([]);
	let selectedUserId = $state('');
	let editing = $state(false);
	let loading = $state(true);
	let saving = $state(false);
	let busyMemberId = $state<string | null>(null);
	let error = $state('');
	let notice = $state('');
	let name = $state('');
	let description = $state('');
	let startDate = $state('');
	let targetDate = $state('');

	let eligibleMembers = $derived(
		workspaceMembers.filter((member) => !project?.members.some((assigned) => assigned.user.id === member.user.id))
	);

	onMount(async () => {
		const token = getAccessToken();
		const user = getUser();
		if (!token || !user) {
			window.location.replace('/login');
			return;
		}
		try {
			await loadWorkspaces(token);
			availableWorkspaces = get(workspaces);
			project = await getProject(token, params.id);
			workspace = availableWorkspaces.find((entry) => entry.id === project?.workspaceId) ?? null;
			if (!workspace) {
				error = 'This project is outside your workspace access.';
				return;
			}
			selectWorkspace(workspace.id);
			if (workspace.role !== 'OWNER') {
				await redirectByRole(workspace.role);
				return;
			}
			workspaceMembers = await apiRequest<WorkspaceMember[]>(`/workspaces/${workspace.id}/members`, { token });
			fillForm(project);
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Project details could not be loaded.';
		} finally {
			loading = false;
		}
	});

	function fillForm(value: ProjectSummary): void {
		name = value.name;
		description = value.description ?? '';
		startDate = value.startDate ? new Date(value.startDate).toISOString().slice(0, 10) : '';
		targetDate = value.targetDate ? new Date(value.targetDate).toISOString().slice(0, 10) : '';
	}

	async function changeWorkspace(nextWorkspace: WorkspaceSummary): Promise<void> {
		if (nextWorkspace.role !== 'OWNER') {
			selectWorkspace(nextWorkspace.id);
			await redirectByRole(nextWorkspace.role);
			return;
		}
		selectWorkspace(nextWorkspace.id);
		await goto(`/owner/projects`);
	}

	async function saveProject(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		const token = getAccessToken();
		if (!token || !project) return logout();
		saving = true;
		error = '';
		try {
			const input: UpdateProjectInput = {
				name: name.trim(),
				description: description.trim() || null,
				startDate: startDate || null,
				targetDate: targetDate || null
			};
			project = await updateProject(token, project.id, input);
			editing = false;
			notice = 'Project details saved.';
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Project details could not be saved.';
		} finally {
			saving = false;
		}
	}

	async function runStatusAction(action: 'activate' | 'hold' | 'complete' | 'archive'): Promise<void> {
		const token = getAccessToken();
		if (!token || !project) return logout();
		saving = true;
		error = '';
		notice = '';
		try {
			project = await changeProjectStatus(token, project.id, action);
			notice = `Project status changed to ${projectStatusLabel(project.status)}.`;
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Project status could not be changed.';
		} finally {
			saving = false;
		}
	}

	async function addMember(): Promise<void> {
		const token = getAccessToken();
		if (!token || !project || !selectedUserId) return;
		busyMemberId = 'adding';
		error = '';
		notice = '';
		try {
			const added = await addProjectMember(token, project.id, selectedUserId);
			project = { ...project, members: [...project.members, added] };
			selectedUserId = '';
			notice = `${added.user.name} was added to this project.`;
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Project member could not be added.';
		} finally {
			busyMemberId = null;
		}
	}

	async function removeMember(member: ProjectMember): Promise<void> {
		if (!project || !window.confirm(`Remove ${member.user.name} from this project?`)) return;
		const token = getAccessToken();
		if (!token) return logout();
		busyMemberId = member.id;
		error = '';
		notice = '';
		try {
			await removeProjectMember(token, project.id, member.id);
			project = { ...project, members: project.members.filter((assigned) => assigned.id !== member.id) };
			notice = `${member.user.name} was removed from this project.`;
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Project member could not be removed.';
		} finally {
			busyMemberId = null;
		}
	}

	function canTransition(status: ProjectStatus, action: 'activate' | 'hold' | 'complete' | 'archive'): boolean {
		const transitions: Record<ProjectStatus, string[]> = {
			DRAFT: ['activate'],
			ACTIVE: ['hold', 'complete'],
			ON_HOLD: ['activate', 'complete'],
			COMPLETED: ['archive'],
			ARCHIVED: []
		};
		return transitions[status].includes(action);
	}
</script>

<svelte:head>
	<title>{project?.name ?? 'Project'} · Milde Project Space</title>
	<meta name="description" content="Project details and assigned members." />
</svelte:head>

<main class="detail-page">
	<header class="page-header">
		<a class="brand" href="/owner" aria-label="Milde Control Center">
			<span class="brand-mark" aria-hidden="true">M</span>
			<span class="brand-name">Milde <span>Project Space</span></span>
		</a>
		<div class="header-tools">
			{#if workspace}<WorkspaceSwitcher selected={workspace} options={availableWorkspaces} onSelect={(nextWorkspace) => void changeWorkspace(nextWorkspace)} />{/if}
			<a href="/owner/projects">Projects</a>
			<button type="button" onclick={() => void logout()}>Log out</button>
		</div>
	</header>

	{#if loading}
		<p class="state" role="status">Loading project…</p>
	{:else if error && !project}
		<p class="state error" role="alert">{error}</p>
	{:else if project && workspace}
		<section class="content">
			<a class="back-link" href="/owner/projects">← All projects</a>
			<div class="title-row">
				<div>
					<p class="eyebrow">{workspace.name}</p>
					<h1>{project.name}</h1>
				</div>
				<span class={`project-status status-${project.status.toLowerCase()}`}>{projectStatusLabel(project.status)}</span>
			</div>
			{#if error}<p class="feedback error" role="alert">{error}</p>{/if}
			{#if notice}<p class="feedback success" role="status">{notice}</p>{/if}

			<section class="project-section" aria-labelledby="project-details-heading">
				<div class="section-heading">
					<div><p class="eyebrow">Project</p><h2 id="project-details-heading">Details</h2></div>
					{#if !editing}<button class="secondary-button" type="button" onclick={() => { fillForm(project!); editing = true; }}>Edit details</button>{/if}
				</div>
				{#if editing}
					<form class="edit-form" onsubmit={saveProject}>
						<label><span>Project name</span><input bind:value={name} maxlength="140" required /></label>
						<label><span>Description</span><textarea bind:value={description} rows="4" maxlength="4000"></textarea></label>
						<div class="date-grid">
							<label><span>Start date</span><input type="date" bind:value={startDate} /></label>
							<label><span>Target date</span><input type="date" bind:value={targetDate} /></label>
						</div>
						<div class="form-actions">
							<button class="secondary-button" type="button" onclick={() => { fillForm(project!); editing = false; }}>Cancel</button>
							<button class="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
						</div>
					</form>
				{:else}
					<p class="description">{project.description || 'No description has been added.'}</p>
					<dl class="project-dates">
						<div><dt>Start date</dt><dd>{formatProjectDate(project.startDate)}</dd></div>
						<div><dt>Target date</dt><dd>{formatProjectDate(project.targetDate)}</dd></div>
					</dl>
				{/if}
			</section>

			<section class="project-section" aria-labelledby="members-heading">
				<div class="section-heading">
					<div><p class="eyebrow">Access</p><h2 id="members-heading">Project members</h2></div>
					<span class="member-count">{project.members.length} assigned</span>
				</div>
				{#if project.members.length}
					<div class="member-list">
						{#each project.members as member (member.id)}
							<article class="member-row">
								<span class="member-initial" aria-hidden="true">{member.user.name.trim().charAt(0).toUpperCase()}</span>
								<span class="member-name"><strong>{member.user.name}</strong><small>{member.user.email}</small></span>
								<span class="member-role">{member.role}</span>
								<button class="remove-button" type="button" disabled={busyMemberId === member.id} onclick={() => void removeMember(member)}>Remove</button>
							</article>
						{/each}
					</div>
				{:else}
					<p class="empty-members">No one has been assigned to this project yet.</p>
				{/if}

				{#if eligibleMembers.length}
					<form class="add-member-form" onsubmit={(event) => { event.preventDefault(); void addMember(); }}>
						<label for="workspace-member">Add a workspace member</label>
						<div class="add-controls">
							<select id="workspace-member" bind:value={selectedUserId} required>
								<option value="" disabled>Select a person</option>
								{#each eligibleMembers as member (member.id)}
									<option value={member.user.id}>{member.user.name} · {member.role}</option>
								{/each}
							</select>
							<button class="secondary-button" type="submit" disabled={!selectedUserId || busyMemberId === 'adding'}>{busyMemberId === 'adding' ? 'Adding…' : 'Add member'}</button>
						</div>
					</form>
				{:else}
					<p class="empty-members">Every workspace member is assigned to this project.</p>
				{/if}
			</section>

			<section class="project-section status-section" aria-labelledby="status-heading">
				<div class="section-heading"><div><p class="eyebrow">Project status</p><h2 id="status-heading">Update status</h2></div></div>
				<p class="status-guidance">Status changes follow the project lifecycle.</p>
				<div class="status-actions">
					{#if canTransition(project.status, 'activate')}<button class="secondary-button" type="button" disabled={saving} onclick={() => void runStatusAction('activate')}>Activate</button>{/if}
					{#if canTransition(project.status, 'hold')}<button class="secondary-button" type="button" disabled={saving} onclick={() => void runStatusAction('hold')}>Place on hold</button>{/if}
					{#if canTransition(project.status, 'complete')}<button class="secondary-button" type="button" disabled={saving} onclick={() => void runStatusAction('complete')}>Mark complete</button>{/if}
					{#if canTransition(project.status, 'archive')}<button class="secondary-button" type="button" disabled={saving} onclick={() => void runStatusAction('archive')}>Archive project</button>{/if}
					{#if project.status === 'ARCHIVED'}<p class="archived-note">Archived projects cannot be reopened.</p>{/if}
				</div>
			</section>
		</section>
	{/if}
</main>

<style>
	.detail-page { min-height: 100svh; padding: 0 clamp(18px, 6vw, 84px) 72px; background: #f6f4ee; color: #292e28; }
	.page-header { display: flex; min-height: 78px; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 1px solid #deddd3; }
	.brand { display: inline-flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; }
	.brand-mark { display: grid; width: 36px; aspect-ratio: 1; place-items: center; border: 1px solid #53604f; color: #344332; font: 19px Georgia, serif; }
	.brand-name { display: grid; font-size: 14px; font-weight: 650; letter-spacing: -0.03em; line-height: 1.1; }
	.brand-name span { margin-top: 4px; color: #696c61; font-size: 9px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; }
	.header-tools { display: flex; align-items: center; gap: 10px; }
	.header-tools a, .header-tools button { display: inline-flex; min-height: 44px; align-items: center; padding: 0 12px; border: 1px solid #cbcbbf; background: transparent; color: #343a32; font: inherit; font-size: 12px; text-decoration: none; cursor: pointer; }
	.header-tools :global(.switcher-trigger) { min-height: 44px; }
	.header-tools a:hover, .header-tools button:hover { background: #eeece4; }
	.content { width: min(100%, 920px); margin: clamp(38px, 7vh, 68px) auto 0; }
	.back-link { display: inline-flex; min-height: 44px; align-items: center; margin-bottom: 28px; color: #53604f; font-size: 13px; text-underline-offset: 4px; }
	.title-row, .section-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; }
	.title-row { margin-bottom: 26px; }
	.eyebrow { margin: 0 0 9px; color: #6a715f; font-size: 11px; font-weight: 650; letter-spacing: 0.14em; text-transform: uppercase; }
	h1 { margin: 0; font: 400 clamp(38px, 6vw, 58px)/1.05 Georgia, 'Times New Roman', serif; letter-spacing: -0.045em; }
	h2 { margin: 0; font: 400 clamp(25px, 4vw, 34px)/1.1 Georgia, 'Times New Roman', serif; letter-spacing: -0.035em; }
	.project-status { padding: 8px 10px; background: #eae9df; color: #465442; font-size: 10px; font-weight: 650; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; }
	.status-on_hold { background: #f2eadb; color: #74552f; }
	.status-completed { background: #e4ebe2; color: #3d5a3b; }
	.status-archived { background: #ecebe8; color: #5e615a; }
	.project-section { margin-top: 26px; padding: 24px clamp(17px, 4vw, 28px); border: 1px solid #e1ded4; background: #fffefa; }
	.section-heading { margin-bottom: 18px; }
	.section-heading .eyebrow { margin-bottom: 6px; }
	.secondary-button, .primary-button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; padding: 0 14px; font: inherit; font-size: 12px; cursor: pointer; }
	.secondary-button { border: 1px solid #b9b9ad; background: transparent; color: #344332; }
	.secondary-button:hover { background: #eeece4; }
	.primary-button { border: 0; background: #344332; color: #fffefa; }
	.primary-button:hover { background: #263324; }
	.secondary-button:disabled, .primary-button:disabled, .remove-button:disabled { cursor: wait; opacity: 0.58; }
	.description { margin: 0 0 21px; color: #4e534a; font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
	.project-dates { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin: 0; padding-top: 18px; border-top: 1px solid #e5e2d9; }
	.project-dates div { display: grid; gap: 5px; }
	.project-dates dt, .status-guidance { color: #62665d; font-size: 12px; }
	.project-dates dd { margin: 0; font-size: 13px; font-weight: 600; }
	.edit-form { display: grid; gap: 17px; }
	.edit-form label { display: grid; gap: 7px; }
	.edit-form label span, .add-member-form > label { color: #343a32; font-size: 12px; font-weight: 600; }
	input, textarea, select { width: 100%; min-height: 44px; padding: 10px 11px; border: 1px solid #b9b9ad; border-radius: 0; background: #fffefa; color: #292e28; font: inherit; font-size: 13px; }
	textarea { min-height: 100px; resize: vertical; line-height: 1.55; }
	.date-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px; }
	.form-actions { display: flex; justify-content: end; gap: 9px; padding-top: 15px; border-top: 1px solid #e5e2d9; }
	.member-count { color: #62665d; font-size: 12px; }
	.member-list { border-top: 1px solid #e5e2d9; }
	.member-row { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto auto; align-items: center; gap: 13px; min-height: 76px; padding: 11px 4px; border-bottom: 1px solid #e5e2d9; }
	.member-initial { display: grid; width: 38px; aspect-ratio: 1; place-items: center; background: #e8e7dc; color: #43513d; font: 16px Georgia, serif; }
	.member-name { display: grid; min-width: 0; gap: 4px; }
	.member-name strong { font-size: 13px; font-weight: 600; }
	.member-name small { overflow-wrap: anywhere; color: #62665d; font-size: 11px; }
	.member-role { padding: 6px 8px; background: #efeee6; color: #4d5b47; font-size: 10px; font-weight: 650; letter-spacing: 0.05em; }
	.remove-button { min-height: 40px; padding: 0 10px; border: 1px solid #cbcbbf; background: transparent; color: #743c34; font: inherit; font-size: 11px; cursor: pointer; }
	.remove-button:hover { background: #f4eae6; }
	.empty-members { margin: 0; padding: 14px 0; color: #62665d; font-size: 13px; }
	.add-member-form { display: grid; gap: 10px; margin-top: 20px; }
	.add-controls { display: flex; gap: 9px; }
	.add-controls select { flex: 1; min-width: 0; }
	.status-guidance { margin: -7px 0 14px; }
	.status-actions { display: flex; flex-wrap: wrap; gap: 9px; }
	.archived-note { align-self: center; color: #62665d; font-size: 12px; }
	.feedback, .state { padding: 14px 16px; border: 1px solid #d9d7cd; background: #fffefa; font-size: 13px; line-height: 1.55; }
	.feedback { margin: 0 0 14px; }
	.error { color: #7b332c; }
	.success { color: #344d36; }
	.state { width: min(100% - 36px, 560px); margin: 15vh auto; }
	:global(:focus-visible) { outline: 3px solid #52604b; outline-offset: 3px; }
	@media (max-width: 600px) {
		.detail-page { padding-right: 16px; padding-left: 16px; }
		.page-header { flex-wrap: wrap; padding: 12px 0; }
		.header-tools { width: 100%; flex-wrap: wrap; gap: 7px; }
		.header-tools :global(.switcher) { flex: 1 1 100%; }
		.header-tools :global(.switcher-trigger) { width: 100%; }
		.content { margin-top: 34px; }
		.title-row { align-items: start; flex-direction: column; }
	}
	@media (max-width: 470px) {
		.member-row { grid-template-columns: 38px minmax(0, 1fr) auto; gap: 9px; }
		.member-name { grid-column: 2 / -1; }
		.member-role { grid-column: 1 / 2; grid-row: 2; justify-self: start; }
		.remove-button { grid-column: 3; grid-row: 2; }
		.add-controls, .form-actions { flex-direction: column; }
		.add-controls button, .form-actions button { width: 100%; }
		.project-dates, .date-grid { grid-template-columns: 1fr; }
	}
</style>
