<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { ApiError } from '$lib/api';
	import { getUser, logout, redirectByRole } from '$lib/auth/session';
	import WorkspaceSwitcher from '$lib/components/WorkspaceSwitcher.svelte';
	import { formatProjectDate, listProjects, projectStatusLabel } from '$lib/projects/api';
	import type { ProjectSummary } from '$lib/projects/types';
	import type { AuthUser, UserRole } from '$lib/auth/types';
	import { loadWorkspaces, selectWorkspace, workspaces } from '$lib/workspaces/state';
	import type { WorkspaceSummary } from '$lib/workspaces/types';

	let {
		role,
		title,
		description = ''
	}: { role: UserRole; title: string; description?: string } = $props();

	let user = $state<AuthUser | null>(null);
	let workspace = $state<WorkspaceSummary | null>(null);
	let availableWorkspaces = $state<WorkspaceSummary[]>([]);
	let myProjects = $state<ProjectSummary[]>([]);
	let projectsLoading = $state(false);
	let projectError = $state('');
	let error = $state('');
	let ready = $state(false);

	onMount(async () => {
		const storedUser = getUser();

		if (!storedUser) {
			window.location.replace('/login');
			return;
		}

		user = storedUser;
		try {
			workspace = await loadWorkspaces();
			availableWorkspaces = get(workspaces);
			if (!workspace) {
				error = 'This account is not a member of a workspace yet.';
				ready = true;
				return;
			}
			if (workspace.role !== role) {
				await redirectByRole(workspace.role);
				return;
			}
			if (role !== 'OWNER') {
				projectsLoading = true;
				try {
				myProjects = await listProjects(workspace.id);
				} catch (cause: unknown) {
					projectError = cause instanceof ApiError ? cause.message : 'Projects could not be loaded.';
				} finally {
					projectsLoading = false;
				}
			}
			ready = true;
		} catch (cause: unknown) {
			error = cause instanceof Error ? cause.message : 'Workspace access could not be loaded.';
			ready = true;
		}
	});

	async function changeWorkspace(nextWorkspace: WorkspaceSummary): Promise<void> {
		selectWorkspace(nextWorkspace.id);
		workspace = nextWorkspace;
		if (nextWorkspace.role !== role) {
			await redirectByRole(nextWorkspace.role);
			return;
		}
		if (role !== 'OWNER') {
			if (!getUser()) return;
			projectsLoading = true;
			projectError = '';
			try {
				myProjects = await listProjects(nextWorkspace.id);
			} catch (cause: unknown) {
				projectError = cause instanceof ApiError ? cause.message : 'Projects could not be loaded.';
			} finally {
				projectsLoading = false;
			}
		}
	}
</script>

<svelte:head>
	<title>{title} · Milde Project Space</title>
	<meta name="description" content={`${title} for Milde Project Space.`} />
</svelte:head>

<main class="portal-page">
	<header class="portal-header">
		<a class="brand" href="/" aria-label="Milde Project Space home">
			<span class="brand-mark" aria-hidden="true">M</span>
			<span class="brand-name">Milde <span>Project Space</span></span>
		</a>
		{#if user}
			<div class="header-tools">
				{#if workspace}
					<WorkspaceSwitcher
						selected={workspace}
						options={availableWorkspaces}
						onSelect={(nextWorkspace) => void changeWorkspace(nextWorkspace)}
					/>
				{/if}
				<button class="logout-button" type="button" onclick={() => void logout()}>Log out</button>
			</div>
		{/if}
	</header>

	{#if !ready}
		<div class="portal-state" role="status">Checking your session…</div>
	{:else if error}
		<p class="portal-state portal-error" role="alert">{error}</p>
	{:else if user}
		<section class="portal-content">
			<p class="eyebrow">{role === 'CLIENT' && workspace ? `${workspace.name} workspace` : 'Milde Project Space'}</p>
			<h1>{title}</h1>
			<p class="welcome">Welcome, {user.name}.</p>
			<div class="identity-card">
				<div class="avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</div>
				<div class="identity-details">
					<strong>{user.name}</strong>
					<span>{user.email}</span>
				</div>
				<span class="role-label">{workspace?.role ?? user.role}</span>
			</div>
			{#if role === 'OWNER' && workspace}
				<nav class="owner-links" aria-label="Workspace management">
					<a class="members-link" href="/owner/projects">Projects</a>
					<a class="members-link" href="/owner/members">Team &amp; access</a>
				</nav>
			{/if}
			{#if role !== 'OWNER' && workspace}
				<section class="my-projects" aria-labelledby="my-projects-title">
					<div class="projects-heading">
						<div>
							<p class="eyebrow">{workspace.name}</p>
							<h2 id="my-projects-title">My Projects</h2>
						</div>
						<p class="projects-guidance">Only projects assigned to your account appear here.</p>
					</div>
					{#if projectsLoading}
						<p class="project-state" role="status">Loading projects…</p>
					{:else if projectError}
						<p class="project-state project-error" role="alert">{projectError}</p>
					{:else if myProjects.length === 0}
						<p class="project-state">No projects have been assigned to your account yet.</p>
					{:else}
						<div class="project-list">
							{#each myProjects as project (project.id)}
								<a class="project-row" href={`/projects/${project.id}`}>
									<span class="project-main">
										<strong>{project.name}</strong>
										<span>{project.targetDate ? `Target ${formatProjectDate(project.targetDate)}` : 'No target date'}</span>
									</span>
									<span class={`project-status status-${project.status.toLowerCase()}`}>{projectStatusLabel(project.status)}</span>
									<span class="project-open">Open <span aria-hidden="true">↗</span></span>
								</a>
							{/each}
						</div>
					{/if}
				</section>
			{/if}
			{#if description}
				<p class="placeholder">{description}</p>
			{/if}
		</section>
	{/if}
</main>

<style>
	.portal-page {
		min-height: 100svh;
		padding: 0 clamp(20px, 6vw, 84px) 72px;
		background: #f6f4ee;
	}

	.portal-header {
		display: flex;
		min-height: 78px;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid #deddd3;
	}

	.header-tools {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		color: #242a24;
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

	.logout-button {
		min-height: 44px;
		padding: 0 17px;
		border: 1px solid #cbcbbf;
		background: transparent;
		color: #343a32;
		cursor: pointer;
		font: inherit;
		font-size: 13px;
		transition: background 120ms ease;
	}

	.logout-button:hover {
		background: #eeece4;
	}

	.portal-content {
		width: min(100%, 800px);
		margin: clamp(56px, 11vh, 110px) auto 0;
	}

	.eyebrow {
		margin: 0 0 14px;
		color: #6a715f;
		font-size: 11px;
		font-weight: 650;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		color: #252a24;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(42px, 7vw, 70px);
		font-weight: 400;
		letter-spacing: -0.05em;
		line-height: 1.02;
	}

	.welcome {
		margin: 17px 0 34px;
		color: #6d7068;
		font-size: 15px;
	}

	.identity-card {
		display: flex;
		min-height: 86px;
		align-items: center;
		gap: 15px;
		padding: 16px 19px;
		border: 1px solid #e1ded4;
		background: #fffefa;
	}

	.avatar {
		display: grid;
		width: 42px;
		aspect-ratio: 1;
		flex: 0 0 auto;
		place-items: center;
		background: #e8e7dc;
		color: #43513d;
		font-family: Georgia, serif;
		font-size: 19px;
	}

	.identity-details {
		display: grid;
		min-width: 0;
		gap: 5px;
	}

	.identity-details strong {
		color: #292e28;
		font-size: 14px;
		font-weight: 600;
	}

	.identity-details span {
		overflow-wrap: anywhere;
		color: #77796f;
		font-size: 12px;
	}

	.role-label {
		margin-left: auto;
		padding: 7px 9px;
		background: #efeee6;
		color: #53604f;
		font-size: 10px;
		font-weight: 650;
		letter-spacing: 0.08em;
	}

	.placeholder {
		max-width: 530px;
		margin: 26px 0 0;
		color: #6d7068;
		font-size: 14px;
		line-height: 1.7;
	}

	.members-link {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
		margin-top: 24px;
		color: #344332;
		font-size: 13px;
		text-underline-offset: 4px;
	}

	.owner-links {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 22px;
		margin-top: 24px;
	}

	.owner-links .members-link { margin-top: 0; }

	.my-projects {
		margin-top: 54px;
		border-top: 1px solid #deddd3;
		padding-top: 28px;
	}

	.projects-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 17px;
	}

	.projects-heading .eyebrow { margin-bottom: 6px; }

	h2 {
		margin: 0;
		color: #292e28;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(25px, 4vw, 34px);
		font-weight: 400;
		letter-spacing: -0.035em;
	}

	.projects-guidance {
		max-width: 260px;
		margin: 0;
		color: #62665d;
		font-size: 12px;
		line-height: 1.5;
	}

	.project-list { border-top: 1px solid #deddd3; }

	.project-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 18px;
		min-height: 76px;
		padding: 12px 10px;
		border-bottom: 1px solid #deddd3;
		color: inherit;
		text-decoration: none;
	}

	.project-row:hover { background: #eeece4; }
	.project-main { display: grid; min-width: 0; gap: 5px; }
	.project-main strong { font-size: 14px; font-weight: 600; }
	.project-main span { color: #62665d; font-size: 12px; }

	.project-status {
		padding: 7px 9px;
		background: #eae9df;
		color: #465442;
		font-size: 10px;
		font-weight: 650;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.status-on_hold { background: #f2eadb; color: #74552f; }
	.status-completed { background: #e4ebe2; color: #3d5a3b; }
	.status-archived { background: #ecebe8; color: #5e615a; }
	.project-open { color: #53604f; font-size: 12px; white-space: nowrap; }
	.project-state { margin: 0; padding: 18px 16px; border: 1px solid #deddd3; background: #fffefa; color: #62665d; font-size: 13px; line-height: 1.55; }
	.project-error { color: #7b332c; }

	.portal-error {
		max-width: 560px;
		margin: 0 auto;
		padding-right: 22px;
		padding-left: 22px;
		color: #7b332c;
	}

	.portal-state {
		padding-top: 18vh;
		color: #6d7068;
		text-align: center;
	}

	@media (max-width: 520px) {
		.portal-page {
			padding-right: 18px;
			padding-left: 18px;
		}

		.portal-header {
			min-height: 70px;
			flex-wrap: wrap;
			row-gap: 12px;
			padding: 12px 0;
		}

		.header-tools { width: 100%; align-items: stretch; }
		.header-tools :global(.switcher) { flex: 1; }
		.header-tools :global(.switcher-trigger) { width: 100%; justify-content: flex-start; }
		.header-tools :global(.workspace-description) { flex: 1; }
		.projects-heading { align-items: start; flex-direction: column; gap: 8px; }
		.projects-guidance { max-width: 100%; }
		.project-row { grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
		.project-status { grid-column: 2; grid-row: 1; }
		.project-open { grid-column: 1 / -1; }

		.identity-card {
			flex-wrap: wrap;
			padding: 15px;
		}

		.role-label {
			margin-left: auto;
		}
	}
</style>
