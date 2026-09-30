<script lang="ts">
	import { onMount } from 'svelte';
	import AuthLayout from '$lib/components/AuthLayout.svelte';
	import { apiRequest } from '$lib/api';
	import { getUser, isAuthenticated, redirectByRole, saveAuth } from '$lib/auth/session';
	import type { LoginResponse } from '$lib/auth/types';

	let email = $state('');
	let password = $state('');
	let busy = $state(false);
	let errorMessage = $state('');
	let registered = $state(false);

	onMount(() => {
		registered = new URLSearchParams(window.location.search).get('registered') === '1';
		if (isAuthenticated()) {
			const user = getUser();
			if (user) void redirectByRole(user.role);
		}
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (busy) return;

		busy = true;
		errorMessage = '';
		try {
			const auth = await apiRequest<LoginResponse>('/auth/login', {
				method: 'POST',
				body: { email: email.trim(), password }
			});
			saveAuth(auth);
			await redirectByRole(auth.user.role);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
		} finally {
			busy = false;
		}
	}
</script>

<AuthLayout title="Welcome back" description="Sign in to your Milde Project Space account.">
	{#if registered}
		<p class="notice success" role="status">Your account is ready. Sign in to continue.</p>
	{/if}

	<form onsubmit={handleSubmit}>
		<div class="field">
			<label for="email">Email address</label>
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				placeholder="you@example.com"
				bind:value={email}
				required
			/>
		</div>

		<div class="field">
			<label for="password">Password</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				placeholder="Enter your password"
				bind:value={password}
				required
			/>
		</div>

		{#if errorMessage}
			<p class="notice error" role="alert">{errorMessage}</p>
		{/if}

		<button class="submit-button" type="submit" disabled={busy}>
			{busy ? 'Signing in…' : 'Sign in'}
		</button>
	</form>

	<p class="switch-link">New to Milde? <a href="/register">Create an account</a></p>
</AuthLayout>

<style>
	form {
		display: grid;
		gap: 19px;
	}

	.field {
		display: grid;
		gap: 8px;
	}

	label {
		color: #373b34;
		font-size: 12px;
		font-weight: 600;
	}

	input {
		width: 100%;
		min-height: 48px;
		padding: 0 13px;
		border: 1px solid #d9d7cd;
		border-radius: 0;
		background: #fffefa;
		color: #252a24;
		font: inherit;
		font-size: 14px;
		transition: border-color 120ms ease, box-shadow 120ms ease;
	}

	input::placeholder {
		color: #a1a198;
	}

	input:focus-visible {
		border-color: #596650;
		outline: 2px solid transparent;
		box-shadow: 0 0 0 3px rgb(89 102 80 / 17%);
	}

	.submit-button {
		min-height: 49px;
		margin-top: 3px;
		border: 1px solid #354533;
		background: #354533;
		color: #fffefa;
		cursor: pointer;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		transition: background 120ms ease, opacity 120ms ease;
	}

	.submit-button:hover:enabled {
		background: #283728;
	}

	.submit-button:disabled {
		cursor: wait;
		opacity: 0.68;
	}

	.notice {
		margin: 0;
		padding: 11px 12px;
		font-size: 12px;
		line-height: 1.5;
	}

	.notice.error {
		border-left: 3px solid #a5523d;
		background: #f7ece7;
		color: #783c30;
	}

	.notice.success {
		margin-bottom: 18px;
		border-left: 3px solid #637658;
		background: #edf0e8;
		color: #3d5036;
	}

	.switch-link {
		margin: 23px 0 0;
		color: #77796f;
		font-size: 12px;
		text-align: center;
	}

	a {
		color: #3f5339;
		font-weight: 650;
		text-underline-offset: 3px;
	}

	a:hover {
		color: #283728;
	}
</style>
