<script lang="ts">
	import { onMount } from 'svelte';
	import type { WorkspaceSummary } from '$lib/workspaces/types';

	let { selected, options, onSelect }: {
		selected: WorkspaceSummary;
		options: WorkspaceSummary[];
		onSelect: (workspace: WorkspaceSummary) => void;
	} = $props();

	let open = $state(false);
	let root: HTMLDivElement;
	let trigger: HTMLButtonElement;

	onMount(() => {
		function closeOnOutside(event: PointerEvent) {
			if (event.target instanceof Node && !root?.contains(event.target)) open = false;
		}

		function closeOnEscape(event: KeyboardEvent) {
			if (event.key === 'Escape' && open) {
				open = false;
				trigger?.focus();
			}
		}

		document.addEventListener('pointerdown', closeOnOutside);
		document.addEventListener('keydown', closeOnEscape);
		return () => {
			document.removeEventListener('pointerdown', closeOnOutside);
			document.removeEventListener('keydown', closeOnEscape);
		};
	});

	function roleName(role: WorkspaceSummary['role']): string {
		return role.charAt(0) + role.slice(1).toLowerCase();
	}

	function choose(workspace: WorkspaceSummary) {
		open = false;
		if (workspace.id !== selected.id) onSelect(workspace);
	}
</script>

<div class="switcher" bind:this={root}>
	<button
		class="switcher-trigger"
		type="button"
		bind:this={trigger}
		aria-expanded={open}
		aria-controls="workspace-options"
		aria-label={`Workspace: ${selected.name}, ${roleName(selected.role)} access. Choose workspace.`}
		onclick={() => (open = !open)}
	>
		<span class="workspace-initial" aria-hidden="true">{selected.name.trim().charAt(0).toUpperCase()}</span>
		<span class="workspace-description">
			<span class="workspace-caption">Workspace</span>
			<strong>{selected.name}</strong>
		</span>
		<span class="workspace-role">{roleName(selected.role)} access</span>
		<svg class:open width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
		</svg>
	</button>

	{#if open}
		<div class="workspace-options" id="workspace-options" aria-label="Choose a workspace">
			<p class="menu-heading">Your workspaces</p>
			{#each options as workspace (workspace.id)}
				<button
					class="workspace-option"
					class:selected-option={workspace.id === selected.id}
					type="button"
					aria-pressed={workspace.id === selected.id}
					onclick={() => choose(workspace)}
				>
					<span class="option-initial" aria-hidden="true">{workspace.name.trim().charAt(0).toUpperCase()}</span>
					<span class="option-copy">
						<strong>{workspace.name}</strong>
						<small>{roleName(workspace.role)} access</small>
					</span>
					{#if workspace.id === selected.id}<span class="current-label">Current</span>{/if}
				</button>
			{/each}
			{#if options.length === 1}
				<p class="menu-note">This is the only workspace connected to your account.</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.switcher {
		position: relative;
		z-index: 2;
	}

	.switcher-trigger {
		display: inline-flex;
		min-height: 52px;
		align-items: center;
		gap: 10px;
		padding: 5px 12px 5px 7px;
		border: 1px solid #d8d6cc;
		background: #fffefa;
		color: #292e28;
		text-align: left;
		cursor: pointer;
		transition: background 120ms ease, border-color 120ms ease;
	}

	.switcher-trigger:hover,
	.switcher-trigger[aria-expanded='true'] {
		border-color: #a8aa9d;
		background: #fdfcf7;
	}

	.workspace-initial,
	.option-initial {
		display: grid;
		width: 36px;
		aspect-ratio: 1;
		flex: 0 0 auto;
		place-items: center;
		background: #e8e7dc;
		color: #43513d;
		font-family: Georgia, serif;
		font-size: 17px;
	}

	.workspace-description,
	.option-copy {
		display: grid;
		gap: 3px;
	}

	.workspace-caption {
		color: #6a6d64;
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.workspace-description strong,
	.option-copy strong {
		font-size: 13px;
		font-weight: 600;
	}

	.workspace-role {
		margin-left: 3px;
		padding: 6px 8px;
		background: #efeee6;
		color: #4d5b47;
		font-size: 10px;
		font-weight: 600;
		white-space: nowrap;
	}

	.switcher-trigger svg {
		flex: 0 0 auto;
		color: #66695f;
		transition: transform 120ms ease;
	}

	.switcher-trigger svg.open { transform: rotate(180deg); }

	.workspace-options {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		width: min(310px, calc(100vw - 36px));
		padding: 10px;
		border: 1px solid #d8d6cc;
		background: #fffefa;
		box-shadow: 0 12px 28px rgb(35 40 34 / 10%);
	}

	.menu-heading {
		margin: 2px 8px 8px;
		color: #686b62;
		font-size: 10px;
		font-weight: 650;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.workspace-option {
		display: flex;
		width: 100%;
		min-height: 60px;
		align-items: center;
		gap: 11px;
		padding: 8px;
		border: 1px solid transparent;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}

	.workspace-option:hover,
	.workspace-option.selected-option {
		border-color: #e2e0d6;
		background: #f6f4ee;
	}

	.workspace-option .option-initial {
		width: 34px;
		font-size: 15px;
	}

	.option-copy { min-width: 0; }
	.option-copy small { color: #62665d; font-size: 11px; }
	.current-label { margin-left: auto; color: #4d5b47; font-size: 10px; }

	.menu-note {
		margin: 8px 8px 2px;
		padding-top: 10px;
		border-top: 1px solid #e2e0d6;
		color: #62665d;
		font-size: 11px;
		line-height: 1.45;
	}

	:global(:focus-visible) {
		outline: 3px solid #52604b;
		outline-offset: 3px;
	}

	@media (max-width: 520px) {
		.switcher-trigger { min-height: 50px; }
		.workspace-options { right: 0; left: auto; }
	}
</style>
