<!-- labeled text input whose focus border picks up the current app's accent color -->
<script lang="ts">
	let {
		value = $bindable(''),
		label,
		type = 'text',
		placeholder,
		accent = 'var(--color-primary)',
		maxlength,
		oninput,
	}: {
		value?: string;
		label?: string;
		type?: 'text' | 'number' | 'tel' | 'password' | 'email';
		placeholder?: string;
		accent?: string;
		maxlength?: number;
		oninput?: (value: string) => void;
	} = $props();

	function handleInput(e: Event) {
		value = (e.currentTarget as HTMLInputElement).value;
		oninput?.(value);
	}
</script>

<label class="app-input" style:--accent={accent}>
	{#if label}<span class="label">{label}</span>{/if}
	<input {type} {placeholder} {maxlength} {value} oninput={handleInput} />
</label>

<style>
	.app-input {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.label {
		font-size: 12px;
		color: var(--color-text-alt);
	}

	input {
		background: transparent;
		border: var(--border-input);
		border-radius: var(--radius);
		padding: 8px 10px;
		font-size: 14px;
		color: var(--color-text);
		outline: none;
		transition: border-color 120ms ease;
	}

	input:hover {
		border-color: #ffffff;
	}

	input:focus {
		border-color: var(--accent);
	}
</style>
