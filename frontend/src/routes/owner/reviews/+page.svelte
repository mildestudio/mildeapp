<script lang="ts">
	import { onMount } from 'svelte';
	import { ApiError } from '$lib/api';
	import { getUser } from '$lib/auth/session';
	import { formatTaskDueDate, listReviewInbox } from '$lib/tasks/api';
	import type { TaskSummary } from '$lib/tasks/types';

	let tasks = $state<TaskSummary[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		if (!getUser()) return window.location.replace('/login');
		try {
			tasks = await listReviewInbox();
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Approval inbox could not be loaded.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head><title>Approval inbox · Milde Project Space</title></svelte:head>

<main class="page">
	<header><a class="brand" href="/owner">Milde <span>Project Space</span></a><a href="/owner">Control Center</a></header>
	<section class="content">
		<p class="eyebrow">Owner review</p>
		<h1>Approval Inbox</h1>
		<p class="intro">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} awaiting review</p>
		{#if loading}<p class="state" role="status">Loading submissions…</p>
		{:else if error}<p class="state error" role="alert">{error}</p>
		{:else if tasks.length === 0}<p class="state">No tasks are waiting for review.</p>
		{:else}
			<div class="list">
				{#each tasks as task (task.id)}
					<article class="row">
						<div class="main"><strong>{task.title}</strong><span>{task.project.name}</span><small>Submitted by {task.submittedBy ?? task.assignee.name} · {task.submittedAt ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(task.submittedAt)) : 'Recently'} · {formatTaskDueDate(task.dueDate)}</small></div>
						<a class="review" href={`/tasks/${task.id}`}>Review</a>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</main>

<style>
	.page { min-height: 100svh; padding: 0 clamp(18px, 6vw, 84px) 70px; background: #f6f4ee; color: #292e28; }
	header { display: flex; min-height: 78px; align-items: center; justify-content: space-between; border-bottom: 1px solid #deddd3; }
	header a { color: #344332; font-size: 13px; text-underline-offset: 4px; }
	.brand { font-weight: 650; text-decoration: none; }.brand span { display: block; margin-top: 3px; color: #696c61; font-size: 9px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; }
	.content { width: min(100%, 860px); margin: clamp(42px, 8vh, 72px) auto; }
	.eyebrow { margin: 0 0 9px; color: #6a715f; font-size: 11px; font-weight: 650; letter-spacing: .13em; text-transform: uppercase; }
	h1 { margin: 0; font: 400 clamp(38px, 7vw, 58px)/1.04 Georgia, serif; letter-spacing: -.045em; }
	.intro { margin: 13px 0 24px; color: #6d7068; font-size: 13px; }
	.list { border-top: 1px solid #deddd3; background: #fffefa; }
	.row { display: flex; min-height: 92px; align-items: center; justify-content: space-between; gap: 20px; padding: 16px 18px; border: 1px solid #deddd3; border-top: 0; }
	.main { display: grid; gap: 5px; }.main strong { color: #292e28; font-size: 14px; font-weight: 600; }.main span { color: #53604f; font-size: 12px; }.main small { color: #77796f; font-size: 11px; }
	.review { display: inline-flex; min-height: 40px; align-items: center; padding: 0 14px; background: #475644; color: #fff; font-size: 12px; text-decoration: none; white-space: nowrap; }
	.state { padding: 20px; border: 1px solid #deddd3; background: #fffefa; color: #62665d; font-size: 13px; }.error { color: #873a31; }
	@media (max-width: 560px) { .row { align-items: flex-start; flex-direction: column; gap: 12px; }.review { min-height: 38px; } }
</style>
