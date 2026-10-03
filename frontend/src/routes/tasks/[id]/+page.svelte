<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types';
	import { ApiError } from '$lib/api';
	import { logout } from '$lib/auth/session';
	import { listProjectMembers } from '$lib/projects/api';
	import type { ProjectMember } from '$lib/projects/types';
	import TaskActivityTimeline from '$lib/tasks/TaskActivityTimeline.svelte';
	import {
		approveTask,
		formatTaskDueDate,
		getTask,
		requestTaskRevision,
		startTask,
		submitTask,
		taskStatusLabel,
		updateTask
	} from '$lib/tasks/api';
	import type { TaskDetail, TaskPriority } from '$lib/tasks/types';

	let { params }: PageProps = $props();
	let task = $state<TaskDetail | null>(null);
	let employees = $state<ProjectMember[]>([]);
	let loading = $state(true);
	let busy = $state(false);
	let editing = $state(false);
	let showRevision = $state(false);
	let error = $state('');
	let notice = $state('');
	let comment = $state('');
	let revisionReason = $state('');
	let editTitle = $state('');
	let editDescription = $state('');
	let editPriority = $state<TaskPriority>('MEDIUM');
	let editDueDate = $state('');
	let editAssignee = $state('');
	let latestRevision = $derived([...task?.activities ?? []].reverse().find((activity) => activity.type === 'REVISION_REQUESTED'));

	onMount(async () => {
		try {
			task = await getTask(params.id);
			fillEditForm(task);
			if (task.viewerRole === 'OWNER') {
				employees = (await listProjectMembers(task.projectId)).filter((member) => member.role === 'EMPLOYEE');
			}
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Task could not be loaded.';
		} finally {
			loading = false;
		}
	});

	function fillEditForm(value: TaskDetail): void {
		editTitle = value.title;
		editDescription = value.description ?? '';
		editPriority = value.priority;
		editDueDate = value.dueDate ? new Date(value.dueDate).toISOString().slice(0, 10) : '';
		editAssignee = value.assigneeProjectMemberId;
	}

	async function runAction(action: 'start' | 'submit' | 'approve'): Promise<void> {
		if (!task) return;
		busy = true;
		error = '';
		notice = '';
		try {
			if (action === 'start') task = await startTask(task.id);
			else if (action === 'submit') {
				task = await submitTask(task.id, comment.trim() || undefined);
				comment = '';
			} else task = await approveTask(task.id);
			notice = action === 'start' ? 'Work started.' : action === 'submit' ? 'Task submitted for review.' : 'Task approved.';
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Task action could not be completed.';
		} finally {
			busy = false;
		}
	}

	async function sendRevision(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!task) return;
		busy = true;
		error = '';
		notice = '';
		try {
			task = await requestTaskRevision(task.id, revisionReason.trim());
			revisionReason = '';
			showRevision = false;
			notice = 'Revision requested. The employee can now resume work.';
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Revision could not be requested.';
		} finally {
			busy = false;
		}
	}

	async function saveMetadata(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!task) return;
		busy = true;
		error = '';
		try {
			task = await updateTask(task.id, {
				title: editTitle.trim(),
				description: editDescription.trim() || null,
				priority: editPriority,
				dueDate: editDueDate || null,
				assigneeId: editAssignee
			});
			editing = false;
			fillEditForm(task);
			notice = 'Task details saved.';
		} catch (cause: unknown) {
			error = cause instanceof ApiError ? cause.message : 'Task details could not be saved.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>{task?.title ?? 'Task'} · Milde Project Space</title>
	<meta name="description" content="Project task status, actions, and activity history." />
</svelte:head>

<main class="page">
	<header class="topbar"><a class="brand" href={task?.viewerRole === 'OWNER' ? '/owner' : '/employee'}>Milde <span>Project Space</span></a>
		<div class="top-actions">
			{#if task}<a href={task.viewerRole === 'OWNER' ? `/owner/projects/${task.projectId}` : '/employee'}>{task.viewerRole === 'OWNER' ? 'Back to project' : 'My tasks'}</a>{/if}
			<button type="button" onclick={() => void logout()}>Log out</button>
		</div>
	</header>
	{#if loading}
		<p class="state">Loading task…</p>
	{:else if task}
		<section class="content">
			<p class="eyebrow">{task.project.name}</p>
			<div class="title-row"><h1>{task.title}</h1><span class={`status status-${task.status.toLowerCase()}`}>{taskStatusLabel(task.status)}</span></div>
			{#if error}<p class="feedback error" role="alert">{error}</p>{/if}
			{#if notice}<p class="feedback success" role="status">{notice}</p>{/if}
			<div class="columns">
				<section class="panel" aria-labelledby="details-heading">
					<div class="section-heading"><h2 id="details-heading">Task details</h2>{#if task.viewerRole === 'OWNER' && !editing}<button class="quiet" type="button" onclick={() => { fillEditForm(task!); editing = true; }}>Edit</button>{/if}</div>
					{#if editing}
						<form class="form" onsubmit={saveMetadata}>
							<label>Title<input bind:value={editTitle} maxlength="160" required /></label>
							<label>Description<textarea bind:value={editDescription} rows="4" maxlength="4000"></textarea></label>
							<label>Assignee<select bind:value={editAssignee} required>{#each employees as employee (employee.id)}<option value={employee.id}>{employee.user.name}</option>{/each}</select></label>
							<div class="edit-grid"><label>Priority<select bind:value={editPriority}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></label><label>Due date<input type="date" bind:value={editDueDate} /></label></div>
							<div class="buttons"><button class="quiet" type="button" onclick={() => { editing = false; fillEditForm(task!); }}>Cancel</button><button class="primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
						</form>
					{:else}
						<p class="description">{task.description || 'No description has been added.'}</p>
						<dl class="facts"><div><dt>Assignee</dt><dd>{task.assignee.user.name}</dd></div><div><dt>Priority</dt><dd><span class={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span></dd></div><div><dt>Due date</dt><dd>{formatTaskDueDate(task.dueDate)}</dd></div><div><dt>Status</dt><dd>{taskStatusLabel(task.status)}</dd></div></dl>
					{/if}
				</section>

				<section class="panel workflow" aria-labelledby="workflow-heading">
					<p class="eyebrow">{task.viewerRole === 'OWNER' ? 'Owner review' : 'Employee workflow'}</p><h2 id="workflow-heading">{taskStatusLabel(task.status)}</h2>
					{#if task.status === 'REVISION_REQUESTED' && latestRevision}
						<div class="revision"><strong>Revision requested</strong><p>{latestRevision.comment}</p></div>
					{/if}
					{#if task.viewerRole === 'EMPLOYEE'}
						{#if task.status === 'TODO' || task.status === 'REVISION_REQUESTED'}
							<button class="primary" type="button" disabled={busy} onclick={() => void runAction('start')}>{task.status === 'TODO' ? 'Start work' : 'Start revision'}</button>
						{:else if task.status === 'IN_PROGRESS'}
							<form class="form" onsubmit={(event) => { event.preventDefault(); void runAction('submit'); }}><label>Submission note (optional)<textarea bind:value={comment} rows="3" maxlength="2000"></textarea></label><button class="primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</button></form>
						{:else if task.status === 'SUBMITTED'}<p class="muted">Waiting for owner review.</p>
						{:else}<p class="approved">This task has been approved.</p>{/if}
					{:else if task.status === 'SUBMITTED'}
						<div class="buttons"><button class="quiet" type="button" disabled={busy} onclick={() => { showRevision = !showRevision; }}>Request revision</button><button class="primary" type="button" disabled={busy} onclick={() => void runAction('approve')}>{busy ? 'Approving…' : 'Approve'}</button></div>
						{#if showRevision}<form class="form revision-form" onsubmit={sendRevision}><label>Revision reason *<textarea bind:value={revisionReason} rows="4" maxlength="2000" required></textarea></label><div class="buttons"><button class="quiet" type="button" onclick={() => { showRevision = false; revisionReason = ''; }}>Cancel</button><button class="primary" disabled={busy || !revisionReason.trim()}>{busy ? 'Sending…' : 'Send revision request'}</button></div></form>{/if}
					{:else if task.status === 'APPROVED'}<p class="approved">Approved. This task is complete.</p>
					{:else}<p class="muted">The employee is working on this task.</p>{/if}
				</section>
			</div>
			<section class="panel activity-panel" aria-labelledby="activity-heading"><p class="eyebrow">History</p><h2 id="activity-heading">Activity</h2><TaskActivityTimeline activities={task.activities} /></section>
		</section>
	{:else}
		<p class="state error" role="alert">{error || 'Task not found.'}</p>
	{/if}
</main>

<style>
	.page { min-height: 100svh; padding: 0 clamp(18px, 6vw, 82px) 70px; background: #f6f4ee; color: #292e28; }
	.topbar { display: flex; min-height: 76px; align-items: center; justify-content: space-between; border-bottom: 1px solid #deddd3; }
	.brand { color: #242a24; font-size: 14px; font-weight: 650; text-decoration: none; }
	.brand span { display: block; margin-top: 3px; color: #696c61; font-size: 9px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; }
	.top-actions { display: flex; align-items: center; gap: 20px; }
	.top-actions a { color: #344332; font-size: 13px; text-underline-offset: 4px; }
	.top-actions button, .quiet { min-height: 40px; padding: 0 13px; border: 1px solid #cbcbbf; background: transparent; color: #344332; cursor: pointer; font: inherit; font-size: 12px; }
	.content { width: min(100%, 1040px); margin: 44px auto 0; }
	.eyebrow { margin: 0 0 9px; color: #6a715f; font-size: 11px; font-weight: 650; letter-spacing: .13em; text-transform: uppercase; }
	.title-row { display: flex; align-items: start; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
	h1 { margin: 0; font: 400 clamp(35px, 6vw, 54px)/1.05 Georgia, serif; letter-spacing: -.045em; }
	.status { flex: 0 0 auto; padding: 8px 10px; background: #eae9df; color: #465442; font-size: 10px; font-weight: 700; letter-spacing: .06em; }
	.status-submitted { background: #f3ead8; color: #76582e; }
	.status-revision_requested { background: #f4e5df; color: #854a3b; }
	.status-approved { background: #e2ebdf; color: #3d5a3b; }
	.feedback { margin: 12px 0; padding: 12px 14px; border: 1px solid #deddd3; font-size: 13px; }
	.error { color: #873a31; }.success { color: #3d5a3b; }
	.columns { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr); gap: 18px; }
	.panel { border: 1px solid #e1ded4; background: #fffefa; padding: clamp(19px, 3vw, 28px); }
	.section-heading { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
	h2 { margin: 0; font: 400 27px/1.12 Georgia, serif; letter-spacing: -.025em; }
	.description { margin: 17px 0 24px; color: #62665d; font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
	.facts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 0; padding-top: 18px; border-top: 1px solid #e3e1d8; }
	.facts div { display: grid; gap: 6px; }.facts dt { color: #77796f; font-size: 11px; }.facts dd { margin: 0; color: #333a31; font-size: 13px; font-weight: 600; }
	.priority { font-size: 11px; letter-spacing: .04em; }.priority-urgent, .priority-high { color: #8b4335; }.priority-medium { color: #53604f; }.priority-low { color: #77796f; }
	.workflow h2 { margin-bottom: 18px; }.workflow > .eyebrow { margin-bottom: 8px; }
	.primary { min-height: 42px; padding: 0 15px; border: 1px solid #475644; background: #475644; color: white; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600; }
	.primary:disabled { cursor: not-allowed; opacity: .55; }
	.buttons { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 9px; }
	.muted, .approved { color: #62665d; font-size: 13px; line-height: 1.55; }.approved { color: #3d5a3b; }
	.revision { margin: 0 0 16px; padding: 13px; border-left: 3px solid #a86954; background: #faf1ed; color: #643e34; font-size: 13px; line-height: 1.55; }.revision p { margin: 6px 0 0; white-space: pre-wrap; }
	.form { display: grid; gap: 14px; }.revision-form { margin-top: 16px; padding-top: 15px; border-top: 1px solid #e3e1d8; }
	.form label { display: grid; gap: 7px; color: #4f554b; font-size: 12px; font-weight: 600; }
	.form input, .form textarea, .form select { width: 100%; min-height: 40px; border: 1px solid #cbcbbf; border-radius: 0; padding: 9px 10px; background: #fffefa; color: #292e28; font: inherit; font-size: 13px; }.form textarea { resize: vertical; }
	.edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
	.activity-panel { margin-top: 18px; }.activity-panel h2 { margin-bottom: 22px; }
	.state { margin: 50px auto; padding: 20px; border: 1px solid #deddd3; color: #62665d; font-size: 13px; }
	@media (max-width: 740px) { .columns { grid-template-columns: 1fr; } }
	@media (max-width: 500px) { .title-row { flex-direction: column; }.edit-grid { grid-template-columns: 1fr; }.top-actions { gap: 9px; } }
</style>
