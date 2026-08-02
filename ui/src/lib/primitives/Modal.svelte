<!-- generic in-phone dialog, body content is a snippet since it's arbitrary per caller -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		showing,
		title,
		acceptLabel = 'OK',
		closeLabel = 'Cancel',
		onAccept,
		onClose,
		children,
	}: {
		showing: boolean;
		title: string;
		acceptLabel?: string;
		closeLabel?: string;
		onAccept: () => void;
		onClose: () => void;
		children: Snippet;
	} = $props();
</script>

{#if showing}
	<div class="backdrop" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()} role="button" tabindex="-1" aria-label="Close dialog">
		<div class="dialog" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="title">{title}</div>
			<div class="body">
				{@render children()}
			</div>
			<div class="actions">
				<button type="button" class="btn btn-ghost" onclick={onClose}>{closeLabel}</button>
				<button type="button" class="btn btn-primary" onclick={onAccept}>{acceptLabel}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 500;
		pointer-events: auto;
	}

	.dialog {
		width: 85%;
		background: var(--color-bg-panel, var(--color-secondary));
		border: var(--border-subtle);
		border-radius: var(--radius-lg);
		padding: 16px;
	}

	.title {
		font-size: 17px;
		color: var(--color-text);
		font-weight: 600;
	}

	.body {
		margin-top: 10px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		color: var(--color-text-alt);
		font-size: 14px;
	}

	.actions {
		margin-top: 16px;
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}

	.btn {
		border: none;
		padding: 8px 14px;
		font-size: 13px;
		cursor: pointer;
		border-radius: var(--radius);
	}

	.btn-ghost {
		background: transparent;
		color: var(--color-text-muted);
		border: var(--border-subtle);
	}

	.btn-primary {
		background: var(--color-primary);
		color: var(--color-primary-contrast);
	}
</style>
