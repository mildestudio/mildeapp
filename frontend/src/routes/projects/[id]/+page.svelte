<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import { get } from 'svelte/store';
	import { ApiError } from '$lib/api';
	import { getUser, logout, redirectByRole } from '$lib/auth/session';
	import WorkspaceSwitcher from '$lib/components/WorkspaceSwitcher.svelte';
	import VirtualSpace from '$lib/spatial/VirtualSpace.svelte';
	import { formatProjectDate, getProject, projectStatusLabel } from '$lib/projects/api';
	import type { ProjectSummary } from '$lib/projects/types';
	import { loadWorkspaces, selectWorkspace, workspaces } from '$lib/workspaces/state';
	import type { WorkspaceSummary } from '$lib/workspaces/types';

	let { params }: PageProps = $props();
	let project = $state<ProjectSummary | null>(null);
	let workspace = $state<WorkspaceSummary | null>(null);
	let availableWorkspaces = $state<WorkspaceSummary[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		if (!getUser()) {
			window.location.replace('/login');
			return;
		}
		try {
			await loadWorkspaces();
			availableWorkspaces = get(workspaces);
			project = await getProject(params.id);
			workspace = availableWorkspaces.find((entry) => entry.id === project?.workspaceId) ?? null;
			if (workspace) selectWorkspace(workspace.id);
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Project details could not be loaded.';
		} finally {
			loading = false;
		}
	});

	async function changeWorkspace(nextWorkspace: WorkspaceSummary): Promise<void> {
		selectWorkspace(nextWorkspace.id);
		await redirectByRole(nextWorkspace.role);
	}
</script>

<svelte:head>
	<title>{project?.name ?? 'Project'} · Milde Project Space</title>
	<meta name="description" content="Project information shared with your account." />
</svelte:head>

<main class="project-page">
	<header class="page-header">
		<a class="brand" href="/" aria-label="Milde Project Space home">
			<span class="brand-mark" aria-hidden="true">M</span>
			<span class="brand-name">Milde <span>Project Space</span></span>
		</a>
		<div class="header-tools">
			{#if workspace}<WorkspaceSwitcher selected={workspace} options={availableWorkspaces} onSelect={(nextWorkspace) => void changeWorkspace(nextWorkspace)} />{/if}
			{#if workspace}<a href={`/${workspace.role.toLowerCase()}`}>My workspace</a>{/if}
			<button type="button" onclick={() => void logout()}>Log out</button>
		</div>
	</header>

	{#if loading}
		<p class="state" role="status">Loading project…</p>
	{:else if error || !project}
		<p class="state error" role="alert">{error || 'Project not found.'}</p>
	{:else}
		<section class="content">
			<a class="back-link" href={workspace ? `/${workspace.role.toLowerCase()}` : '/'}>← My workspace</a>
			<div class="title-row">
				<div><p class="eyebrow">{workspace?.name ?? 'Project'}</p><h1>{project.name}</h1></div>
				<span class={`status status-${project.status.toLowerCase()}`}>{projectStatusLabel(project.status)}</span>
			</div>
			<nav class="project-sections" aria-label="Project sections"><a href="#overview">Overview</a><a href="#virtual-space">Virtual Space</a></nav>
			<section id="overview" class="detail-panel" aria-labelledby="detail-heading">
				<p class="eyebrow">Project information</p>
				<h2 id="detail-heading">Details</h2>
				<p class="description">{project.description || 'No description has been added.'}</p>
				<dl class="dates">
					<div><dt>Start date</dt><dd>{formatProjectDate(project.startDate)}</dd></div>
					<div><dt>Target date</dt><dd>{formatProjectDate(project.targetDate)}</dd></div>
				</dl>
			</section>
			<VirtualSpace projectId={project.id} />
			<section class="detail-panel" aria-labelledby="project-people-heading">
				<p class="eyebrow">Access</p>
				<h2 id="project-people-heading">Project members</h2>
				{#if project.members.length}
					<div class="member-list">
						{#each project.members as member (member.id)}
							<article class="member-row">
								<span class="member-initial" aria-hidden="true">{member.user.name.trim().charAt(0).toUpperCase()}</span>
								<span class="member-identity"><strong>{member.user.name}</strong><small>{member.user.email}</small></span>
								<span class="member-role">{member.role}</span>
							</article>
						{/each}
					</div>
				{:else}
					<p class="no-members">No members have been assigned to this project.</p>
				{/if}
			</section>
		</section>
	{/if}
</main>

<style>
	.project-sections { display: flex; flex-wrap: wrap; gap: 24px; }
	.project-sections a { display: inline-flex; min-height: 44px; align-items: center; color: #344332; text-underline-offset: 4px; }
	.project-page { min-height: 100svh; padding: 0 clamp(18px, 6vw, 84px) 72px; background: #f6f4ee; color: #292e28; }
	.page-header { display: flex; min-height: 78px; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 1px solid #deddd3; }
	.brand { display: inline-flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; }
	.brand-mark { display: grid; width: 36px; aspect-ratio: 1; place-items: center; border: 1px solid #53604f; color: #344332; font: 19px Georgia, serif; }
	.brand-name { display: grid; font-size: 14px; font-weight: 650; letter-spacing: -0.03em; line-height: 1.1; }
	.brand-name span { margin-top: 4px; color: #696c61; font-size: 9px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; }
	.header-tools { display: flex; align-items: center; gap: 9px; }
	.header-tools a, .header-tools button { display: inline-flex; min-height: 44px; align-items: center; padding: 0 12px; border: 1px solid #cbcbbf; background: transparent; color: #343a32; font: inherit; font-size: 12px; text-decoration: none; cursor: pointer; }
	.header-tools :global(.switcher-trigger) { min-height: 44px; }
	.header-tools a:hover, .header-tools button:hover { background: #eeece4; }
	.content { width: min(100%, 820px); margin: clamp(40px, 8vh, 76px) auto 0; }
	.back-link { display: inline-flex; min-height: 44px; align-items: center; margin-bottom: 28px; color: #53604f; font-size: 13px; text-underline-offset: 4px; }
	.title-row { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 26px; }
	.eyebrow { margin: 0 0 9px; color: #6a715f; font-size: 11px; font-weight: 650; letter-spacing: 0.14em; text-transform: uppercase; }
	h1 { margin: 0; font: 400 clamp(37px, 6vw, 58px)/1.05 Georgia, 'Times New Roman', serif; letter-spacing: -0.045em; }
	h2 { margin: 0 0 14px; font: 400 27px/1.1 Georgia, 'Times New Roman', serif; letter-spacing: -0.03em; }
	.status { padding: 8px 10px; background: #eae9df; color: #465442; font-size: 10px; font-weight: 650; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; }
	.status-on_hold { background: #f2eadb; color: #74552f; }
	.status-completed { background: #e4ebe2; color: #3d5a3b; }
	.status-archived { background: #ecebe8; color: #5e615a; }
	.detail-panel { margin-top: 19px; padding: clamp(18px, 4vw, 26px); border: 1px solid #e1ded4; background: #fffefa; }
	.description { margin: 0 0 19px; color: #4e534a; font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
	.dates { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 0; padding-top: 16px; border-top: 1px solid #e5e2d9; }
	.dates div { display: grid; gap: 5px; }
	.dates dt { color: #62665d; font-size: 12px; }
	.dates dd { margin: 0; font-size: 13px; font-weight: 600; }
	.member-list { border-top: 1px solid #e5e2d9; }
	.member-row { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 12px; min-height: 70px; padding: 10px 2px; border-bottom: 1px solid #e5e2d9; }
	.member-initial { display: grid; width: 38px; aspect-ratio: 1; place-items: center; background: #e8e7dc; color: #43513d; font: 16px Georgia, serif; }
	.member-identity { display: grid; min-width: 0; gap: 4px; }
	.member-identity strong { font-size: 13px; font-weight: 600; }
	.member-identity small { overflow-wrap: anywhere; color: #62665d; font-size: 11px; }
	.member-role { padding: 6px 8px; background: #efeee6; color: #4d5b47; font-size: 10px; font-weight: 650; }
	.no-members { margin: 0; color: #62665d; font-size: 13px; }
	.state { width: min(100% - 36px, 560px); margin: 15vh auto; padding: 14px 16px; border: 1px solid #d9d7cd; background: #fffefa; color: #62665d; font-size: 13px; }
	.error { color: #7b332c; }
	:global(:focus-visible) { outline: 3px solid #52604b; outline-offset: 3px; }
	@media (max-width: 560px) { .project-page { padding-right: 16px; padding-left: 16px; } .page-header { flex-wrap: wrap; padding: 12px 0; } .header-tools { width: 100%; flex-wrap: wrap; gap: 7px; } .header-tools :global(.switcher) { flex: 1 1 100%; } .header-tools :global(.switcher-trigger) { width: 100%; } .content { margin-top: 34px; } .title-row { align-items: start; flex-direction: column; } }
	@media (max-width: 430px) { .dates { grid-template-columns: 1fr; } .member-row { grid-template-columns: 38px minmax(0, 1fr); } .member-role { grid-column: 2; justify-self: start; } }
</style>
