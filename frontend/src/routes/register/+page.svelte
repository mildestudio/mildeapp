<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import AuthLayout from '$lib/components/AuthLayout.svelte';
	import { apiRequest } from '$lib/api';
	import { getUser, isAuthenticated, redirectByRole } from '$lib/auth/session';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmation = $state('');
	let busy = $state(false);
	let errorMessage = $state('');
	const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
	const passwordHtmlPattern = '(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}';

	onMount(() => {
		if (isAuthenticated()) {
			const user = getUser();
			if (user) void redirectByRole(user.role);
		}
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (busy) return;

		if (!passwordPattern.test(password)) {
			errorMessage = 'Use at least 8 characters, including an uppercase letter, a number, and a symbol.';
			return;
		}

		if (password !== confirmation) {
			errorMessage = 'Passwords do not match. Check both fields and try again.';
			return;
		}

		busy = true;
		errorMessage = '';
		try {
			await apiRequest<unknown>('/auth/register', {
				method: 'POST',
				body: { name: name.trim(), email: email.trim(), password }
			});
			await goto('/login?registered=1', { replaceState: true });
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';
		} finally {
			busy = false;
		}
	}
</script>

<AuthLayout title="Create your account" description="Set up a client account in Milde Project Space.">
	<form onsubmit={handleSubmit}>
		<div class="field">
			<label for="name">Full name</label>
			<input
				id="name"
				name="name"
				type="text"
				autocomplete="name"
				placeholder="Your full name"
				bind:value={name}
				required
			/>
		</div>

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
				autocomplete="new-password"
				minlength="8"
				pattern={passwordHtmlPattern}
				aria-describedby="password-hint"
				placeholder="Create a strong password"
				bind:value={password}
				required
			/>
			<span class="field-hint" id="password-hint">
				At least 8 characters, with one uppercase letter, one number, and one symbol.
			</span>
		</div>

		<div class="field">
			<label for="confirmation">Confirm password</label>
			<input
				id="confirmation"
				name="confirmation"
				type="password"
				autocomplete="new-password"
				placeholder="Enter your password again"
				bind:value={confirmation}
				required
			/>
		</div>

		{#if errorMessage}
			<p class="notice error" role="alert">{errorMessage}</p>
		{/if}

		<button class="submit-button" type="submit" disabled={busy}>
			{busy ? 'Creating account…' : 'Create client account'}
		</button>
	</form>

	<p class="switch-link">Already have an account? <a href="/login">Sign in</a></p>
</AuthLayout>

<style>
	form {
		display: grid;
		gap: 14px;
	}

	.field {
		display: grid;
		gap: 7px;
	}

	label {
		color: #373b34;
		font-size: 12px;
		font-weight: 600;
	}

	input {
		width: 100%;
		min-height: 46px;
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

	.field-hint {
		color: #85867c;
		font-size: 11px;
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
		border-left: 3px solid #a5523d;
		background: #f7ece7;
		color: #783c30;
		font-size: 12px;
		line-height: 1.5;
	}

	.switch-link {
		margin: 22px 0 0;
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
