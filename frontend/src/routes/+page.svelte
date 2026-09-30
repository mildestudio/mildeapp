<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getUser, isAuthenticated, redirectByRole } from '$lib/auth/session';

	onMount(() => {
		if (!isAuthenticated()) {
			void goto('/login', { replaceState: true });
			return;
		}

		const user = getUser();
		if (user) void redirectByRole(user.role);
	});
</script>

<svelte:head>
	<title>Milde Project Space</title>
	<meta name="description" content="A shared space for Milde projects." />
</svelte:head>

<main class="redirect-state" role="status">Opening your project space…</main>

<style>
	.redirect-state {
		padding: 20vh 24px;
		color: #64685f;
		font-size: 14px;
		text-align: center;
	}
</style>
