<!-- plain CSS spinner, no dependency needed for a single rotating ring -->
<script lang="ts">
	let { text = 'Loading', subtext, static: isStatic = false }: { text?: string; subtext?: string; static?: boolean } = $props();
</script>

<div class="loader" class:static={isStatic}>
	<div class="spinner"></div>
	{#if text}<div class="text">{text}</div>{/if}
	{#if subtext}<div class="subtext">{subtext}</div>{/if}
</div>

<style>
	.loader {
		text-align: center;
		margin-top: 10px;
	}

	.loader.static {
		position: absolute;
		inset: 0;
		margin: auto;
		width: fit-content;
		height: fit-content;
	}

	.spinner {
		width: 28px;
		height: 28px;
		margin: 0 auto 10px;
		border: 3px solid rgba(255, 255, 255, 0.15);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 800ms linear infinite;
	}

	.text {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
	}

	.subtext {
		font-size: 12px;
		color: var(--color-text-muted);
		margin-top: 4px;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
