<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { ApiError } from '$lib/api';
	import { getUser, logout, redirectByRole } from '$lib/auth/session';
	import WorkspaceSwitcher from '$lib/components/WorkspaceSwitcher.svelte';
	import { formatProjectDate, listProjects, projectStatusLabel } from '$lib/projects/api';
	import type { ProjectSummary } from '$lib/projects/types';
	import { loadWorkspaces, selectWorkspace, workspaces } from '$lib/workspaces/state';
	import type { WorkspaceSummary } from '$lib/workspaces/types';

	let workspace = $state<WorkspaceSummary | null>(null);
	let availableWorkspaces = $state<WorkspaceSummary[]>([]);
	let projects = $state<ProjectSummary[]>([]);
	let ready = $state(false);
	let loading = $state(false);
	let error = $state('');

	onMount(async () => {
		const user = getUser();
		if (!user) {
			window.location.replace('/login');
			return;
		}
		try {
			workspace = await loadWorkspaces();
			availableWorkspaces = get(workspaces);
			if (!workspace) {
				error = 'This account is not a member of a workspace.';
			} else if (workspace.role !== 'OWNER') {
				await redirectByRole(workspace.role);
				return;
			} else {
				await refreshProjects(workspace.id);
			}
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Projects could not be loaded.';
		} finally {
			ready = true;
		}
	});

	async function refreshProjects(workspaceId: string): Promise<void> {
		loading = true;
		error = '';
		try {
			projects = await listProjects(workspaceId);
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Projects could not be loaded.';
		} finally {
			loading = false;
		}
	}

	async function changeWorkspace(nextWorkspace: WorkspaceSummary): Promise<void> {
		if (nextWorkspace.role !== 'OWNER') {
			selectWorkspace(nextWorkspace.id);
			await redirectByRole(nextWorkspace.role);
			return;
		}
		if (!getUser()) return logout();
		selectWorkspace(nextWorkspace.id);
		workspace = nextWorkspace;
		await refreshProjects(nextWorkspace.id);
	}
</script>

<svelte:head>
	<title>Projects · Milde Project Space</title>
	<meta name="description" content="Projects in the selected Milde workspace." />
</svelte:head>

<main class="projects-page">
	<header class="page-header">
		<a class="brand" href="/owner" aria-label="Milde Control Center">
			<span class="brand-mark" aria-hidden="true">M</span>
			<span class="brand-name">Milde <span>Project Space</span></span>
		</a>
		<div class="header-tools">
			{#if workspace}
				<WorkspaceSwitcher
					selected={workspace}
					options={availableWorkspaces}
					onSelect={(nextWorkspace) => void changeWorkspace(nextWorkspace)}
				/>
			{/if}
			<a class="team-link" href="/owner/members">Team &amp; access</a>
			<button class="logout-button" type="button" onclick={() => void logout()}>Log out</button>
		</div>
	</header>

	{#if !ready}
		<p class="page-state" role="status">Loading projects…</p>
	{:else if error && !workspace}
		<p class="page-state error" role="alert">{error}</p>
	{:else if workspace}
		<section class="content">
			<a class="back-link" href="/owner">← Control Center</a>
			<div class="heading-row">
				<div>
					<p class="eyebrow">{workspace.name}</p>
					<h1>Projects</h1>
				</div>
				<a class="primary-button" href="/owner/projects/new">New project</a>
			</div>

			{#if error}
				<p class="page-state error" role="alert">{error}</p>
			{:else if loading}
				<p class="page-state" role="status">Loading projects…</p>
			{:else if projects.length === 0}
				<div class="empty-state">
					<p class="empty-label">No projects yet</p>
					<p>Create the first project in {workspace.name}.</p>
					<a href="/owner/projects/new">Create a project</a>
				</div>
			{:else}
				<div class="project-list">
					{#each projects as project (project.id)}
						<a class="project-row" href={`/owner/projects/${project.id}`}>
							<span class="project-title">
								<strong>{project.name}</strong>
								<span>{project.description || 'No description'}</span>
							</span>
							<span class="client-cell">
								<small>Client</small>
								<strong>{project.members.find((member) => member.role === 'CLIENT')?.user.name ?? 'Not assigned'}</strong>
							</span>
							<span class="target-cell">
								<small>Target</small>
								<strong>{formatProjectDate(project.targetDate)}</strong>
							</span>
							<span class={`project-status status-${project.status.toLowerCase()}`}>{projectStatusLabel(project.status)}</span>
							<span class="open-project">Open <span aria-hidden="true">↗</span></span>
						</a>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</main>

<style>
	.projects-page { min-height: 100svh; padding: 0 clamp(18px, 6vw, 84px) 72px; background: #f6f4ee; color: #292e28; }
	.page-header { display: flex; min-height: 78px; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 1px solid #deddd3; }
	.brand { display: inline-flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; }
	.brand-mark { display: grid; width: 36px; aspect-ratio: 1; place-items: center; border: 1px solid #53604f; color: #344332; font: 19px Georgia, serif; }
	.brand-name { display: grid; font-size: 14px; font-weight: 650; letter-spacing: -0.03em; line-height: 1.1; }
	.brand-name span { margin-top: 4px; color: #696c61; font-size: 9px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; }
	.header-tools { display: flex; align-items: center; gap: 12px; }
	.header-tools :global(.switcher-trigger) { min-height: 44px; }
	.team-link, .logout-button { display: inline-flex; min-height: 44px; align-items: center; padding: 0 12px; border: 1px solid #cbcbbf; background: transparent; color: #343a32; font: inherit; font-size: 12px; text-decoration: none; cursor: pointer; }
	.team-link:hover, .logout-button:hover { background: #eeece4; }
	.content { width: min(100%, 1000px); margin: clamp(42px, 8vh, 78px) auto 0; }
	.back-link { display: inline-flex; min-height: 44px; align-items: center; margin-bottom: 28px; color: #53604f; font-size: 13px; text-underline-offset: 4px; }
	.heading-row { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
	.eyebrow { margin: 0 0 10px; color: #6a715f; font-size: 11px; font-weight: 650; letter-spacing: 0.14em; text-transform: uppercase; }
	h1 { margin: 0; font: 400 clamp(40px, 6vw, 60px)/1.05 Georgia, 'Times New Roman', serif; letter-spacing: -0.045em; }
	.primary-button { display: inline-flex; min-height: 46px; align-items: center; justify-content: center; padding: 0 18px; background: #344332; color: #fffefa; font-size: 13px; text-decoration: none; }
	.primary-button:hover { background: #263324; }
	.project-list { border-top: 1px solid #d9d7cd; }
	.project-row { display: grid; grid-template-columns: minmax(190px, 1fr) minmax(110px, 160px) minmax(105px, 135px) auto auto; align-items: center; gap: 20px; min-height: 91px; padding: 14px 10px; border-bottom: 1px solid #d9d7cd; color: inherit; text-decoration: none; }
	.project-row:hover { background: #eeece4; }
	.project-title, .client-cell, .target-cell { display: grid; min-width: 0; gap: 5px; }
	.project-title strong, .client-cell strong, .target-cell strong { overflow-wrap: anywhere; font-size: 13px; font-weight: 600; }
	.project-title span { display: -webkit-box; overflow: hidden; color: #62665d; font-size: 12px; line-height: 1.45; -webkit-box-orient: vertical; line-clamp: 2; -webkit-line-clamp: 2; }
	.client-cell small, .target-cell small { color: #696c61; font-size: 10px; letter-spacing: 0.07em; text-transform: uppercase; }
	.project-status { padding: 7px 9px; background: #eae9df; color: #465442; font-size: 10px; font-weight: 650; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; }
	.status-on_hold { background: #f2eadb; color: #74552f; }
	.status-completed { background: #e4ebe2; color: #3d5a3b; }
	.status-archived { background: #ecebe8; color: #5e615a; }
	.open-project { color: #53604f; font-size: 12px; white-space: nowrap; }
	.empty-state, .page-state { padding: 19px; border: 1px solid #d9d7cd; background: #fffefa; color: #62665d; font-size: 13px; line-height: 1.55; }
	.empty-state p { margin: 0 0 10px; }
	.empty-state .empty-label { color: #292e28; font: 24px Georgia, serif; }
	.empty-state a { display: inline-flex; min-height: 44px; align-items: center; color: #344332; text-underline-offset: 4px; }
	.error { color: #7b332c; }
	.page-state { width: min(100% - 36px, 600px); margin: 15vh auto; }
	:global(:focus-visible) { outline: 3px solid #52604b; outline-offset: 3px; }
	@media (max-width: 820px) {
		.project-row { grid-template-columns: minmax(0, 1fr) auto auto; gap: 12px; }
		.project-title { grid-column: 1 / -1; }
		.client-cell, .target-cell { grid-row: 2; }
		.project-status { grid-column: 2; grid-row: 3; justify-self: start; }
		.open-project { grid-column: 3; grid-row: 3; justify-self: end; }
	}
	@media (max-width: 560px) {
		.projects-page { padding-right: 16px; padding-left: 16px; }
		.page-header { flex-wrap: wrap; padding: 12px 0; }
		.header-tools { width: 100%; flex-wrap: wrap; gap: 7px; }
		.header-tools :global(.switcher) { flex: 1 1 100%; }
		.header-tools :global(.switcher-trigger) { width: 100%; }
		.content { margin-top: 35px; }
		.heading-row { align-items: start; flex-direction: column; }
		.project-row { grid-template-columns: minmax(0, 1fr) auto; }
		.client-cell { grid-column: 1; grid-row: 2; }
		.target-cell { grid-column: 2; grid-row: 2; }
		.project-status { grid-column: 1; grid-row: 3; }
		.open-project { grid-column: 2; grid-row: 3; }
	}
</style>
