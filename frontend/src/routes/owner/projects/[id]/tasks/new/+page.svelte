<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types';
	import { ApiError } from '$lib/api';
	import { getUser, logout } from '$lib/auth/session';
	import { getProject } from '$lib/projects/api';
	import type { ProjectSummary } from '$lib/projects/types';
	import { createTask } from '$lib/tasks/api';
	import type { TaskPriority } from '$lib/tasks/types';

	let { params }: PageProps = $props();
	let project = $state<ProjectSummary | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let title = $state('');
	let description = $state('');
	let assigneeId = $state('');
	let priority = $state<TaskPriority>('MEDIUM');
	let dueDate = $state('');
	let employees = $derived(project?.members.filter((member) => member.role === 'EMPLOYEE') ?? []);

	onMount(async () => {
		if (!getUser()) return window.location.replace('/login');
		try {
			project = await getProject(params.id);
			const workspaces = await (await import('$lib/workspaces/state')).loadWorkspaces();
			if (workspaces?.id !== project.workspaceId || workspaces.role !== 'OWNER') {
				window.location.replace('/owner');
				return;
			}
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Project could not be loaded.';
		} finally {
			loading = false;
		}
	});

	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!getUser()) return logout();
		if (!project) return;
		saving = true;
		error = '';
		try {
			const task = await createTask(project.id, {
				title: title.trim(),
				description: description.trim() || null,
				assigneeId,
				priority,
				dueDate: dueDate || null
			});
			await goto(`/tasks/${task.id}`);
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Task could not be created.';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>New task · Milde Project Space</title></svelte:head>

<main class="page">
	<header><a href="/owner">Milde <span>Project Space</span></a><a href={`/owner/projects/${params.id}`}>Back to project</a></header>
	{#if loading}
		<p class="state">Loading project…</p>
	{:else if project}
		<section class="panel">
			<p class="eyebrow">{project.name}</p>
			<h1>Create task</h1>
			<p class="intro">Assign a piece of project work to an employee for review.</p>
			{#if error}<p class="error" role="alert">{error}</p>{/if}
			{#if employees.length === 0}<p class="empty">Add an employee to this project before creating an employee task.</p>{/if}
			<form onsubmit={submit}>
				<label>Title *<input bind:value={title} maxlength="160" required /></label>
				<label>Description<textarea bind:value={description} rows="4" maxlength="4000"></textarea></label>
				<label>Assignee *<select bind:value={assigneeId} required disabled={!employees.length}>
					<option value="" disabled>Select a project employee</option>
					{#each employees as employee (employee.id)}<option value={employee.id}>{employee.user.name}</option>{/each}
				</select></label>
				<div class="grid">
					<label>Priority<select bind:value={priority}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></label>
					<label>Due date<input type="date" bind:value={dueDate} /></label>
				</div>
				<div class="actions"><a class="secondary" href={`/owner/projects/${params.id}`}>Cancel</a><button class="primary" disabled={saving || !employees.length}>{saving ? 'Creating…' : 'Create task'}</button></div>
			</form>
		</section>
	{:else}
		<p class="state error" role="alert">{error || 'Project not found.'}</p>
	{/if}
</main>

<style>
	.page { min-height: 100svh; padding: 0 clamp(18px, 6vw, 80px) 64px; background: #f6f4ee; color: #292e28; }
	header { display: flex; min-height: 76px; align-items: center; justify-content: space-between; border-bottom: 1px solid #deddd3; }
	header a { color: #344332; font-size: 13px; text-underline-offset: 4px; }
	header a:first-child { font-weight: 650; text-decoration: none; }
	header span { color: #77796f; font-size: 10px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; }
	.panel { width: min(100%, 650px); margin: 54px auto; padding: clamp(22px, 5vw, 42px); border: 1px solid #e1ded4; background: #fffefa; }
	.eyebrow { margin: 0 0 9px; color: #6a715f; font-size: 11px; letter-spacing: .13em; text-transform: uppercase; }
	h1 { margin: 0; font: 400 clamp(34px, 6vw, 48px)/1.05 Georgia, serif; letter-spacing: -.04em; }
	.intro { margin: 12px 0 26px; color: #6d7068; font-size: 13px; }
	form { display: grid; gap: 17px; }
	label { display: grid; gap: 7px; color: #4f554b; font-size: 12px; font-weight: 600; }
	input, textarea, select { width: 100%; min-height: 43px; border: 1px solid #cbcbbf; border-radius: 0; padding: 10px 11px; background: #fffefa; color: #292e28; font: inherit; font-size: 14px; }
	textarea { resize: vertical; }
	.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
	.actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
	.primary, .secondary { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; padding: 0 17px; border: 1px solid #475644; cursor: pointer; font: inherit; font-size: 13px; text-decoration: none; }
	.primary { background: #475644; color: white; }
	.secondary { background: transparent; color: #344332; }
	.primary:disabled { opacity: .55; cursor: not-allowed; }
	.state, .empty { padding: 20px; border: 1px solid #deddd3; color: #62665d; font-size: 13px; }
	.error { color: #873a31; }
	@media (max-width: 520px) { .grid { grid-template-columns: 1fr; } }
</style>
