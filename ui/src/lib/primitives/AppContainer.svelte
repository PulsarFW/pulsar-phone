<!-- shared per-app titlebar+scroll-body wrapper every app screen renders inside -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { dataState } from '../store/data.svelte';
	import { CORE_APPS, hexToRgb } from '../../config';

	let {
		appId,
		title,
		colorOverride,
		useAppColor = false,
		actions,
		children,
	}: {
		appId: string;
		title?: string;
		colorOverride?: string;
		useAppColor?: boolean;
		actions?: Snippet;
		children: Snippet;
	} = $props();

	const app = $derived(dataState.appRegistry[appId] ?? CORE_APPS.find((a) => a.name === appId));
	const tintColor = $derived(colorOverride ?? app?.color);
	const headerTitle = $derived(title ?? app?.storeLabel ?? appId);
	const bodyBackground = $derived.by(() => {
		if (!tintColor || (!useAppColor && !colorOverride)) return 'var(--color-secondary)';
		const [r, g, b] = hexToRgb(tintColor);
		return `linear-gradient(180deg, rgba(${r}, ${g}, ${b}, 0.22) 0%, rgba(${r}, ${g}, ${b}, 0.06) 100%), var(--color-secondary)`;
	});
</script>

<div class="app-container" style:background={bodyBackground}>
	<div class="header">
		<div class="title">{headerTitle}</div>
		{#if actions}
			<div class="actions">{@render actions()}</div>
		{/if}
	</div>
	<div class="body">
		{@render children()}
	</div>
</div>

<style>
	.app-container {
		height: 100%;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 19px;
		font-weight: 700;
		letter-spacing: 0.01em;
		height: 55px;
		flex-shrink: 0;
		padding: 0 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 1px 6px rgba(0, 0, 0, 0.15);
	}

	.title {
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex-grow: 1;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 4px;
		text-align: right;
	}

	.body {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		position: relative;
	}
</style>
