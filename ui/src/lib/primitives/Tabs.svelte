<!-- horizontal tab strip, active indicator picks up the current app's accent color -->
<script lang="ts">
	let {
		tabs,
		active = $bindable(),
		accent = 'var(--color-primary)',
	}: {
		tabs: { id: string; label: string }[];
		active: string;
		accent?: string;
	} = $props();
</script>

<div class="tabs" style:--accent={accent}>
	{#each tabs as tab (tab.id)}
		<button type="button" class="tab" class:active={tab.id === active} onclick={() => (active = tab.id)}>
			{tab.label}
		</button>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		border-bottom: 1px solid rgba(255, 255, 255, 0.12);
	}

	.tab {
		flex: 1;
		background: none;
		border: none;
		padding: 10px 0;
		font-size: 13px;
		color: var(--color-text-muted);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: color 120ms ease;
	}

	.tab.active {
		color: var(--color-text);
		border-bottom-color: var(--accent);
	}
</style>
