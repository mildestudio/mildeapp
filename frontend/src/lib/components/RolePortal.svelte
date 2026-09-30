<script lang="ts">
	import { onMount } from 'svelte';
	import { getAccessToken, getUser, logout, redirectByRole } from '$lib/auth/session';
	import type { AuthUser, UserRole } from '$lib/auth/types';
	import { loadWorkspaces } from '$lib/workspaces/state';
	import type { WorkspaceSummary } from '$lib/workspaces/types';

	let {
		role,
		title,
		description = ''
	}: { role: UserRole; title: string; description?: string } = $props();

	let user = $state<AuthUser | null>(null);
	let workspace = $state<WorkspaceSummary | null>(null);
	let error = $state('');
	let ready = $state(false);

	onMount(async () => {
		const token = getAccessToken();
		const storedUser = getUser();

		if (!token || !storedUser) {
			window.location.replace('/login');
			return;
		}

		user = storedUser;
		try {
			workspace = await loadWorkspaces(token);
			if (!workspace) {
				error = 'This account is not a member of a workspace yet.';
				ready = true;
				return;
			}
			if (workspace.role !== role) {
				await redirectByRole(workspace.role);
				return;
			}
			ready = true;
		} catch (cause: unknown) {
			error = cause instanceof Error ? cause.message : 'Workspace access could not be loaded.';
			ready = true;
		}
	});
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
		{#if ready && user}
			<button class="logout-button" type="button" onclick={() => void logout()}>Log out</button>
		{/if}
	</header>

	{#if !ready}
		<div class="portal-state" role="status">Checking your session…</div>
	{:else if error}
		<p class="portal-state portal-error" role="alert">{error}</p>
	{:else if user}
		<section class="portal-content">
			<p class="eyebrow">Milde Project Space</p>
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
				<a class="members-link" href="/owner/members">Team &amp; access</a>
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
		}

		.identity-card {
			flex-wrap: wrap;
			padding: 15px;
		}

		.role-label {
			margin-left: auto;
		}
	}
</style>
