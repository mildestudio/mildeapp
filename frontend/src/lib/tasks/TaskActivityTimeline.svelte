<script lang="ts">
	import type { TaskActivity } from './types';

	let { activities }: { activities: TaskActivity[] } = $props();
	const labels: Record<TaskActivity['type'], string> = {
		CREATED: 'created this task',
		STARTED: 'started work',
		SUBMITTED: 'submitted the task',
		REVISION_REQUESTED: 'requested a revision',
		APPROVED: 'approved the task'
	};
	const time = (value: string) => new Intl.DateTimeFormat('en-GB', {
		day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
	}).format(new Date(value));
</script>

{#if activities.length}
	<ol class="timeline" aria-label="Task activity">
		{#each activities as activity (activity.id)}
			<li>
				<span class="marker" aria-hidden="true"></span>
				<div class="event">
					<time datetime={activity.createdAt}>{time(activity.createdAt)}</time>
					<p><strong>{activity.actor.name}</strong> {labels[activity.type]}</p>
					{#if activity.comment}<blockquote>{activity.comment}</blockquote>{/if}
				</div>
			</li>
		{/each}
	</ol>
{:else}
	<p class="empty">No activity yet.</p>
{/if}

<style>
	.timeline { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
	.timeline li { position: relative; display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 12px; padding-bottom: 20px; }
	.timeline li:not(:last-child)::before { position: absolute; top: 13px; bottom: 0; left: 5px; width: 1px; background: #deddd3; content: ''; }
	.marker { z-index: 1; width: 11px; height: 11px; margin-top: 4px; border: 2px solid #63715d; border-radius: 50%; background: #fffefa; }
	.event time { color: #77796f; font-size: 11px; }
	.event p { margin: 4px 0 0; color: #363b34; font-size: 13px; line-height: 1.5; }
	.event strong { font-weight: 650; }
	blockquote { margin: 7px 0 0; border-left: 2px solid #c9cbbf; padding: 3px 0 3px 10px; color: #62665d; font-size: 13px; line-height: 1.55; }
	.empty { color: #77796f; font-size: 13px; }
</style>
