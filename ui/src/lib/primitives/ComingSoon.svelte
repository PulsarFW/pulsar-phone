<script lang="ts">
	import AppIcon from '../components/AppIcon.svelte';

	let { name, color, description, note }: { name: string; color: string; description: string; note?: string } = $props();
</script>

<div class="placeholder">
	<AppIcon {name} {color} size={72} />
	<div class="sub">{description}</div>
	{#if note}
		<div class="note">{note}</div>
	{/if}
</div>

<style>
	.placeholder {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 14px;
		padding: 0 30px;
		text-align: center;
	}

	.sub {
		font-size: 13px;
		color: var(--color-text-muted);
		line-height: 1.5;
	}

	.note {
		font-size: 12.5px;
		color: var(--color-warning);
		border: 1px solid rgba(240, 147, 72, 0.35);
		border-radius: var(--radius);
		padding: 6px 10px;
	}
</style>
