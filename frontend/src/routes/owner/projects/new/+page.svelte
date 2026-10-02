<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { ApiError } from '$lib/api';
	import { getAccessToken, getUser, logout, redirectByRole } from '$lib/auth/session';
	import WorkspaceSwitcher from '$lib/components/WorkspaceSwitcher.svelte';
	import { createProject } from '$lib/projects/api';
	import { loadWorkspaces, selectWorkspace, workspaces } from '$lib/workspaces/state';
	import type { WorkspaceSummary } from '$lib/workspaces/types';

	let workspace = $state<WorkspaceSummary | null>(null);
	let availableWorkspaces = $state<WorkspaceSummary[]>([]);
	let name = $state('');
	let description = $state('');
	let startDate = $state('');
	let targetDate = $state('');
	let ready = $state(false);
	let saving = $state(false);
	let error = $state('');

	onMount(async () => {
		const token = getAccessToken();
		const user = getUser();
		if (!token || !user) {
			window.location.replace('/login');
			return;
		}
		try {
			workspace = await loadWorkspaces(token);
			availableWorkspaces = get(workspaces);
			if (!workspace) error = 'This account is not a member of a workspace.';
			else if (workspace.role !== 'OWNER') {
				await redirectByRole(workspace.role);
				return;
			}
		} catch (cause: unknown) {
			error = cause instanceof Error ? cause.message : 'Workspace access could not be loaded.';
		} finally {
			ready = true;
		}
	});

	async function changeWorkspace(nextWorkspace: WorkspaceSummary): Promise<void> {
		if (nextWorkspace.role !== 'OWNER') {
			selectWorkspace(nextWorkspace.id);
			await redirectByRole(nextWorkspace.role);
			return;
		}
		workspace = nextWorkspace;
		selectWorkspace(nextWorkspace.id);
	}

	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		const token = getAccessToken();
		if (!token) return logout();
		if (!workspace) return;
		saving = true;
		error = '';
		try {
			const project = await createProject(token, workspace.id, {
				name: name.trim(),
				description: description.trim() || null,
				startDate: startDate || null,
				targetDate: targetDate || null
			});
			await goto(`/owner/projects/${project.id}`);
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'The project could not be created.';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>New Project · Milde Project Space</title>
	<meta name="description" content="Create a project in the selected workspace." />
</svelte:head>

<main class="project-form-page">
	<header class="page-header">
		<a class="brand" href="/owner" aria-label="Milde Control Center">
			<span class="brand-mark" aria-hidden="true">M</span>
			<span class="brand-name">Milde <span>Project Space</span></span>
		</a>
		<div class="header-tools">
			{#if workspace}
				<WorkspaceSwitcher selected={workspace} options={availableWorkspaces} onSelect={(nextWorkspace) => void changeWorkspace(nextWorkspace)} />
			{/if}
			<a href="/owner/projects">Projects</a>
			<button type="button" onclick={() => void logout()}>Log out</button>
		</div>
	</header>

	{#if !ready}
		<p class="state" role="status">Checking workspace access…</p>
	{:else if error && !workspace}
		<p class="state error" role="alert">{error}</p>
	{:else if workspace}
		<section class="content">
			<a class="back-link" href="/owner/projects">← All projects</a>
			<p class="eyebrow">{workspace.name}</p>
			<h1>New project</h1>
			<p class="intro">Start with a name. You can assign workspace members after creating it.</p>

			{#if error}<p class="error-message" role="alert">{error}</p>{/if}
			<form onsubmit={submit}>
				<label class="field">
					<span>Project name <b aria-hidden="true">*</b></span>
					<input bind:value={name} maxlength="140" required autocomplete="off" placeholder="e.g. Smith Residence" />
				</label>
				<label class="field">
					<span>Description <small>Optional</small></span>
					<textarea bind:value={description} maxlength="4000" rows="4" placeholder="A short note about the work"></textarea>
				</label>
				<div class="date-fields">
					<label class="field">
						<span>Start date <small>Optional</small></span>
						<input bind:value={startDate} type="date" />
					</label>
					<label class="field">
						<span>Target date <small>Optional</small></span>
						<input bind:value={targetDate} type="date" />
					</label>
				</div>
				<p class="form-note">New projects start as Draft. Target date must be on or after the start date.</p>
				<div class="form-actions">
					<a href="/owner/projects">Cancel</a>
					<button class="primary-button" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create project'}</button>
				</div>
			</form>
		</section>
	{/if}
</main>

<style>
	.project-form-page { min-height: 100svh; padding: 0 clamp(18px, 6vw, 84px) 72px; background: #f6f4ee; color: #292e28; }
	.page-header { display: flex; min-height: 78px; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 1px solid #deddd3; }
	.brand { display: inline-flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; }
	.brand-mark { display: grid; width: 36px; aspect-ratio: 1; place-items: center; border: 1px solid #53604f; color: #344332; font: 19px Georgia, serif; }
	.brand-name { display: grid; font-size: 14px; font-weight: 650; letter-spacing: -0.03em; line-height: 1.1; }
	.brand-name span { margin-top: 4px; color: #696c61; font-size: 9px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; }
	.header-tools { display: flex; align-items: center; gap: 10px; }
	.header-tools a, .header-tools button { display: inline-flex; min-height: 44px; align-items: center; padding: 0 12px; border: 1px solid #cbcbbf; background: transparent; color: #343a32; font: inherit; font-size: 12px; text-decoration: none; cursor: pointer; }
	.header-tools :global(.switcher-trigger) { min-height: 44px; }
	.header-tools a:hover, .header-tools button:hover { background: #eeece4; }
	.content { width: min(100%, 680px); margin: clamp(40px, 8vh, 76px) auto 0; }
	.back-link { display: inline-flex; min-height: 44px; align-items: center; margin-bottom: 28px; color: #53604f; font-size: 13px; text-underline-offset: 4px; }
	.eyebrow { margin: 0 0 10px; color: #6a715f; font-size: 11px; font-weight: 650; letter-spacing: 0.14em; text-transform: uppercase; }
	h1 { margin: 0; font: 400 clamp(40px, 6vw, 58px)/1.05 Georgia, 'Times New Roman', serif; letter-spacing: -0.045em; }
	.intro { margin: 14px 0 28px; color: #62665d; font-size: 14px; line-height: 1.6; }
	form { padding: clamp(18px, 4vw, 30px); border: 1px solid #e1ded4; background: #fffefa; }
	.field { display: grid; gap: 8px; margin-bottom: 20px; }
	.field > span { color: #343a32; font-size: 12px; font-weight: 600; }
	.field b { color: #743c34; }
	.field small { margin-left: 4px; color: #6b6e65; font-size: 11px; font-weight: 400; }
	input, textarea { width: 100%; min-height: 46px; padding: 11px 12px; border: 1px solid #b9b9ad; border-radius: 0; background: #fffefa; color: #292e28; font: inherit; font-size: 14px; }
	textarea { min-height: 110px; resize: vertical; line-height: 1.55; }
	input:focus-visible, textarea:focus-visible { outline: 3px solid #52604b; outline-offset: 2px; }
	.date-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
	.form-note { margin: -3px 0 20px; color: #62665d; font-size: 11px; line-height: 1.5; }
	.form-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 16px; border-top: 1px solid #e1ded4; }
	.form-actions a { display: inline-flex; min-height: 46px; align-items: center; padding: 0 12px; color: #4e5749; font-size: 13px; }
	.primary-button { min-height: 46px; padding: 0 18px; border: 0; background: #344332; color: #fffefa; font: inherit; font-size: 13px; cursor: pointer; }
	.primary-button:hover { background: #263324; }
	.primary-button:disabled { cursor: wait; opacity: 0.6; }
	.error-message, .state { padding: 14px 16px; border: 1px solid #d9d7cd; background: #fffefa; color: #7b332c; font-size: 13px; line-height: 1.55; }
	.state { width: min(100% - 36px, 560px); margin: 15vh auto; }
	:global(:focus-visible) { outline: 3px solid #52604b; outline-offset: 3px; }
	@media (max-width: 580px) {
		.project-form-page { padding-right: 16px; padding-left: 16px; }
		.page-header { flex-wrap: wrap; padding: 12px 0; }
		.header-tools { width: 100%; flex-wrap: wrap; gap: 7px; }
		.header-tools :global(.switcher) { flex: 1 1 100%; }
		.header-tools :global(.switcher-trigger) { width: 100%; }
		.date-fields { grid-template-columns: 1fr; gap: 0; }
		.form-actions { flex-direction: column-reverse; }
		.form-actions a, .form-actions button { width: 100%; justify-content: center; }
	}
</style>
