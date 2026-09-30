<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		children
	}: { title: string; description: string; children: Snippet } = $props();
</script>

<svelte:head>
	<title>{title} · Milde Project Space</title>
	<meta name="description" content={description} />
</svelte:head>

<main class="auth-shell">
	<aside class="studio-panel">
		<a class="brand" href="/" aria-label="Milde Project Space home">
			<span class="brand-mark" aria-hidden="true">M</span>
			<span class="brand-name">Milde <span>Project Space</span></span>
		</a>

		<div class="studio-intro">
			<p class="eyebrow">Milde Project Space</p>
			<h1>Your work, in one place.</h1>
			<p class="studio-description">
				Sign in to access your projects and account.
			</p>
		</div>

		<div class="architecture-art" aria-hidden="true">
			<div class="art-outline"></div>
			<div class="art-opening"></div>
			<div class="art-plane"></div>
			<div class="art-caption">01 <span>space in progress</span></div>
		</div>

		<p class="studio-footnote">Client and team access</p>
	</aside>

	<section class="form-stage" aria-label={title}>
		<div class="form-wrap">
			<div class="mobile-brand" aria-hidden="true">
				<span class="brand-mark">M</span>
				<span class="brand-name">Milde <span>Project Space</span></span>
			</div>
			<div class="form-heading">
				<p class="eyebrow">Project Space</p>
				<h2>{title}</h2>
				<p>{description}</p>
			</div>
			<div class="form-card">
				{@render children()}
			</div>
			<p class="form-note">Milde Project Space <span aria-hidden="true">·</span> A place for good work.</p>
		</div>
	</section>
</main>

<style>
	.auth-shell {
		min-height: 100svh;
		display: grid;
		grid-template-columns: minmax(320px, 0.92fr) minmax(440px, 1.08fr);
		background: #f6f4ee;
	}

	.studio-panel {
		position: relative;
		isolation: isolate;
		display: flex;
		min-height: 100svh;
		flex-direction: column;
		padding: clamp(28px, 4vw, 64px);
		overflow: hidden;
		background: #e9e7dd;
	}

	.brand {
		z-index: 1;
		display: inline-flex;
		width: fit-content;
		align-items: center;
		gap: 12px;
		color: #242a24;
		text-decoration: none;
	}

	.brand-mark {
		display: grid;
		width: 38px;
		aspect-ratio: 1;
		place-items: center;
		border: 1px solid #53604f;
		color: #344332;
		font-family: Georgia, serif;
		font-size: 20px;
	}

	.brand-name {
		display: grid;
		font-size: 15px;
		font-weight: 650;
		letter-spacing: -0.03em;
		line-height: 1.1;
	}

	.brand-name span {
		margin-top: 4px;
		color: #696c61;
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.studio-intro {
		z-index: 1;
		max-width: 420px;
		margin-top: clamp(54px, 10vh, 112px);
	}

	.eyebrow {
		margin: 0 0 15px;
		color: #6a715f;
		font-size: 11px;
		font-weight: 650;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.studio-intro h1 {
		max-width: 390px;
		margin: 0;
		color: #242a24;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(42px, 5vw, 68px);
		font-weight: 400;
		letter-spacing: -0.055em;
		line-height: 0.99;
	}

	.studio-description {
		max-width: 330px;
		margin: 20px 0 0;
		color: #5e6259;
		font-size: 14px;
		line-height: 1.7;
	}

	.architecture-art {
		position: relative;
		width: min(100%, 390px);
		flex: 1;
		min-height: 190px;
		margin: 28px auto 0;
	}

	.art-outline {
		position: absolute;
		top: 2%;
		left: 22%;
		width: 57%;
		height: 95%;
		border: 1px solid #aeb1a2;
	}

	.art-opening {
		position: absolute;
		bottom: 0;
		left: 33%;
		width: 34%;
		height: 76%;
		border: 1px solid #78816e;
		border-bottom: 0;
	}

	.art-opening::after {
		position: absolute;
		top: 9%;
		bottom: 0;
		left: 14%;
		width: 72%;
		border: 1px solid #b6ad99;
		border-bottom: 0;
		content: '';
	}

	.art-plane {
		position: absolute;
		right: 8%;
		bottom: 0;
		width: 37%;
		height: 43%;
		background: #bd805f;
		opacity: 0.84;
		clip-path: polygon(18% 0, 100% 0, 100% 100%, 0 100%);
	}

	.art-caption {
		position: absolute;
		bottom: 14px;
		left: 0;
		display: flex;
		gap: 12px;
		align-items: center;
		color: #53604f;
		font-size: 10px;
		letter-spacing: 0.1em;
	}

	.art-caption span {
		color: #77796f;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.studio-footnote {
		z-index: 1;
		margin: 28px 0 0;
		color: #6f7268;
		font-size: 11px;
		letter-spacing: 0.035em;
	}

	.form-stage {
		display: grid;
		min-width: 0;
		place-items: center;
		padding: clamp(24px, 6vw, 88px);
	}

	.form-wrap {
		width: min(100%, 440px);
	}

	.mobile-brand {
		display: none;
		align-items: center;
		gap: 11px;
		margin-bottom: 42px;
	}

	.form-heading {
		margin-bottom: 26px;
	}

	.form-heading .eyebrow {
		margin-bottom: 10px;
	}

	.form-heading h2 {
		margin: 0;
		color: #252a24;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(34px, 4vw, 43px);
		font-weight: 400;
		letter-spacing: -0.045em;
		line-height: 1.08;
	}

	.form-heading > p:last-child {
		margin: 10px 0 0;
		color: #6d7068;
		font-size: 14px;
		line-height: 1.6;
	}

	.form-card {
		padding: clamp(22px, 3vw, 34px);
		border: 1px solid #e7e4da;
		background: #fffefa;
		box-shadow: 0 16px 44px rgb(41 43 35 / 5%);
	}

	.form-note {
		margin: 22px 0 0;
		color: #8a8b82;
		font-size: 11px;
		text-align: center;
	}

	.form-note span {
		padding: 0 5px;
	}

	@media (max-width: 820px) {
		.auth-shell {
			grid-template-columns: minmax(280px, 0.82fr) minmax(360px, 1.18fr);
		}

		.studio-panel {
			padding: 32px 26px;
		}

		.studio-intro h1 {
			font-size: clamp(40px, 6vw, 56px);
		}

		.form-stage {
			padding: 32px 24px;
		}
	}

	@media (max-width: 640px) {
		.auth-shell {
			grid-template-columns: 1fr;
		}

		.studio-panel {
			display: none;
		}

		.form-stage {
			align-items: start;
			padding: 26px 20px 32px;
		}

		.mobile-brand {
			display: flex;
			margin-bottom: 40px;
		}

		.form-heading {
			margin-bottom: 22px;
		}

		.form-card {
			padding: 22px 18px;
		}
	}
</style>
