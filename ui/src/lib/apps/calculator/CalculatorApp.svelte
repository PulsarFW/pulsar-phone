<!-- basic 4-function calculator with keyboard support -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';

	let expr = $state('');

	const ALLOWED_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '=', '+', '-', '/', '*', 'Backspace', 'Enter'];

	const display = $derived(expr.replace(/\*/g, '×').replace(/\//g, '÷') || '0');

	// simple two-pass evaluator (tokenize -> resolve */ -> resolve +-), no math-eval dependency needed
	// since only +-*/ decimals are ever produced
	function evaluate(input: string): number {
		const normalized = input.startsWith('-') ? `0${input}` : input;
		const tokens = normalized.match(/\d+\.?\d*|[+\-*/]/g);
		if (!tokens || tokens.length === 0) throw new Error('empty');

		const stack: (number | string)[] = [Number(tokens[0])];
		if (Number.isNaN(stack[0])) throw new Error('bad token');

		for (let i = 1; i < tokens.length; i += 2) {
			const op = tokens[i];
			const val = Number(tokens[i + 1]);
			if (tokens[i + 1] === undefined || Number.isNaN(val)) throw new Error('bad token');
			if (op === '*' || op === '/') {
				const prev = stack.pop() as number;
				stack.push(op === '*' ? prev * val : prev / val);
			} else {
				stack.push(op, val);
			}
		}

		let result = stack[0] as number;
		for (let i = 1; i < stack.length; i += 2) {
			result = stack[i] === '+' ? result + (stack[i + 1] as number) : result - (stack[i + 1] as number);
		}
		if (!Number.isFinite(result)) throw new Error('not finite');
		return result;
	}

	function press(key: string) {
		switch (key) {
			case 'reset':
				expr = '';
				break;
			case 'Backspace':
			case 'del':
				expr = expr.slice(0, -1);
				break;
			case 'Enter':
			case '=':
				try {
					expr = evaluate(expr).toString();
				} catch {
					expr = 'Math Error';
				}
				break;
			default:
				expr += key;
		}
	}

	$effect(() => {
		function onKeydown(e: KeyboardEvent) {
			if (ALLOWED_KEYS.includes(e.key)) press(e.key);
		}
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	const KEYS: { label: string; key: string; kind: 'digit' | 'op' | 'wide-danger' | 'wide-primary' }[] = [
		{ label: '7', key: '7', kind: 'digit' },
		{ label: '8', key: '8', kind: 'digit' },
		{ label: '9', key: '9', kind: 'digit' },
		{ label: 'Del', key: 'del', kind: 'op' },
		{ label: '4', key: '4', kind: 'digit' },
		{ label: '5', key: '5', kind: 'digit' },
		{ label: '6', key: '6', kind: 'digit' },
		{ label: '+', key: '+', kind: 'op' },
		{ label: '1', key: '1', kind: 'digit' },
		{ label: '2', key: '2', kind: 'digit' },
		{ label: '3', key: '3', kind: 'digit' },
		{ label: '−', key: '-', kind: 'op' },
		{ label: '.', key: '.', kind: 'digit' },
		{ label: '0', key: '0', kind: 'digit' },
		{ label: '÷', key: '/', kind: 'op' },
		{ label: '×', key: '*', kind: 'op' },
	];
</script>

<AppContainer appId="calculator" title="Calculator" useAppColor={true}>
	<div class="calculator">
		<div class="display">{display}</div>
		<div class="keys">
			{#each KEYS as k (k.key)}
				<button class="key {k.kind}" onclick={() => press(k.key)}>{k.label}</button>
			{/each}
		</div>
		<div class="bottom-row">
			<button class="key wide danger" onclick={() => press('reset')}>Reset</button>
			<button class="key wide primary" onclick={() => press('=')}>=</button>
		</div>
	</div>
</AppContainer>

<style>
	/* mirrors the dialer's iOS-style circular keys (fixed size, centered, generously spaced) instead of
	   giant edge-to-edge squares - matches the visual language established elsewhere in the phone and
	   fills the full screen height via space-evenly instead of clustering at the top */
	.calculator {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-evenly;
		padding: 18px 14px 24px;
	}

	.display {
		width: 100%;
		max-width: 320px;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding: 10px 18px;
		background: var(--color-bg-panel);
		border-radius: 16px;
		box-shadow: var(--shadow-card);
		font-family: 'Courier New', monospace;
		font-size: 30px;
		font-weight: 600;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.keys {
		width: 100%;
		max-width: 320px;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		justify-items: center;
		row-gap: 12px;
	}

	.key {
		width: 68px;
		height: 68px;
		border: none;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 22px;
		font-weight: 600;
		cursor: pointer;
		background: rgba(255, 255, 255, 0.08);
		color: var(--color-text);
	}

	.key:active {
		background: rgba(255, 255, 255, 0.18);
	}

	.key.op {
		background: var(--color-primary);
		color: #fff;
	}

	.key.op:active {
		background: var(--color-primary-light);
	}

	.bottom-row {
		width: 100%;
		max-width: 320px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.key.wide {
		width: 100%;
		height: 52px;
		border-radius: 26px;
		font-size: 16px;
	}

	.key.danger {
		background: var(--color-error);
		color: #fff;
	}

	.key.primary {
		background: var(--color-success);
		color: #fff;
	}
</style>
