<!-- native <select> chrome can't be restyled in a CEF NUI, so this is a self-contained listbox instead -->
<script lang="ts">
	interface Option {
		value: string | number | boolean | null;
		label: string;
		disabled?: boolean;
	}

	let {
		value = $bindable(),
		options,
		placeholder = 'Select...',
		disabled = false,
		onchange,
	}: {
		value: string | number | boolean | null;
		options: Option[];
		placeholder?: string;
		disabled?: boolean;
		onchange?: (value: string | number | boolean | null) => void;
	} = $props();

	let open = $state(false);
	let root: HTMLDivElement;

	const selected = $derived(options.find((o) => o.value === value));

	function toggle() {
		if (disabled) return;
		open = !open;
	}

	function pick(opt: Option) {
		if (opt.disabled) return;
		value = opt.value;
		onchange?.(opt.value);
		open = false;
	}

	function onWindowClick(e: MouseEvent) {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') open = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="dropdown" bind:this={root}>
	<button type="button" class="control" class:open class:disabled onclick={toggle} {disabled}>
		<span class:placeholder={!selected}>{selected ? selected.label : placeholder}</span>
		<svg class="chevron" class:open viewBox="0 0 12 8" width="10" height="7">
			<path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</button>

	{#if open}
		<div class="panel">
			<div class="options">
				{#each options as opt (opt.value)}
					<button type="button" class="option" class:active={opt.value === value} class:disabled={opt.disabled} onclick={() => pick(opt)}>
						{opt.label}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.dropdown {
		position: relative;
		width: 100%;
	}

	.control {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: transparent;
		border: var(--border-input);
		border-radius: var(--radius);
		padding: 8px 10px;
		font-size: 14px;
		font-family: inherit;
		color: var(--color-text);
		cursor: pointer;
		text-align: left;
	}

	.control.open {
		border-color: var(--color-primary-light);
	}

	.control.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.placeholder {
		color: var(--color-text-muted);
	}

	.chevron {
		flex-shrink: 0;
		margin-left: 8px;
		color: var(--color-text-muted);
		transition: transform 150ms ease;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.panel {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 20;
		background: var(--color-bg-panel-alt);
		border: var(--border-subtle);
		border-radius: var(--radius);
		box-shadow: var(--shadow-panel);
		overflow: hidden;
	}

	.options {
		max-height: 180px;
		overflow-y: auto;
	}

	.option {
		display: block;
		width: 100%;
		padding: 8px 10px;
		background: transparent;
		border: none;
		font-family: inherit;
		color: var(--color-text);
		font-size: 14px;
		text-align: left;
		cursor: pointer;
	}

	.option:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.option.active {
		color: var(--color-primary-light);
	}

	.option.disabled {
		color: var(--color-text-muted);
		cursor: not-allowed;
	}
</style>
