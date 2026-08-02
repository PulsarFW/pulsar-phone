<!-- yes/no confirmation dialog, purely local (delete contact, delete conversation, delete email, etc) - no Lua round trip -->
<script lang="ts">
	let {
		showing,
		title,
		description,
		acceptLabel = 'Yes',
		denyLabel = 'No',
		onAccept,
		onDeny,
	}: {
		showing: boolean;
		title: string;
		description?: string;
		acceptLabel?: string;
		denyLabel?: string;
		onAccept: () => void;
		onDeny: () => void;
	} = $props();
</script>

{#if showing}
	<div class="backdrop" onclick={onDeny} onkeydown={(e) => e.key === 'Escape' && onDeny()} role="button" tabindex="-1" aria-label="Close dialog">
		<div class="dialog" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="title">{title}</div>
			{#if description}
				<div class="description">{description}</div>
			{/if}
			<div class="actions">
				<button type="button" class="btn btn-ghost" onclick={onDeny}>{denyLabel}</button>
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
		width: 80%;
		background: var(--color-bg-panel, var(--color-secondary));
		border: var(--border-subtle);
		border-radius: var(--radius-lg);
		padding: 16px;
	}

	.title {
		font-size: 16px;
		color: var(--color-text);
		font-weight: 600;
	}

	.description {
		margin-top: 8px;
		font-size: 13px;
		color: var(--color-text-muted);
		line-height: 1.4;
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
		background: var(--color-error);
		color: var(--color-text);
	}
</style>
