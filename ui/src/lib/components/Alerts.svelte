<!-- transient toast, shows one alert at a time near the bottom of the screen -->
<script lang="ts">
	import { alertsState } from '../store/alerts.svelte';

	const current = $derived(alertsState.list[0]);
</script>

{#if current}
	<div class="alert" class:error={current.kind === 'error'} class:success={current.kind === 'success'}>
		{current.message}
	</div>
{/if}

<style>
	.alert {
		background: rgba(0, 0, 0, 0.75);
		padding: 10px 14px;
		border-radius: 5px;
		position: absolute;
		bottom: 15%;
		left: 0;
		right: 0;
		margin: auto;
		width: fit-content;
		max-width: 90%;
		min-height: 40px;
		z-index: 10004;
		pointer-events: none;
		color: var(--color-text);
		text-align: center;
		animation: fade-in 200ms ease;
	}

	.alert.error {
		border: 1px solid var(--color-error-light);
	}

	.alert.success {
		border: 1px solid var(--color-success);
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
