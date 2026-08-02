<!-- nav bar: position lock, home, back -->
<script lang="ts">
	import Icon from './Icon.svelte';
	import { shellState, toggleLocked } from '../store/shell.svelte';
	import { navigateHome, goBack, navState } from '../store/nav.svelte';
	import { pushAlert } from '../store/alerts.svelte';

	function onLock() {
		toggleLocked();
		pushAlert(shellState.locked ? 'Phone Position Locked' : 'Phone Position Unlocked - Drag To Move');
	}
</script>

<div class="footer">
	<button class="f-button" onclick={onLock} aria-label="Toggle position lock">
		<Icon name={shellState.locked ? 'floppy-disk' : 'unlock'} size="17px" />
	</button>
	<button class="f-home" onclick={navigateHome} aria-label="Home">
		<Icon name="house" size="19px" />
	</button>
	<button class="f-button" onclick={goBack} disabled={navState.app === null} aria-label="Back">
		<Icon name="chevron-left" size="20px" />
	</button>
</div>

<style>
	.footer {
		background: var(--color-secondary);
		height: 50px;
		flex-shrink: 0;
		border-bottom-left-radius: var(--phone-radius, 20px);
		border-bottom-right-radius: var(--phone-radius, 20px);
		display: flex;
		align-items: center;
		justify-content: space-evenly;
		color: var(--color-text-alt);
	}

	.f-button {
		background: none;
		border: none;
		color: inherit;
		width: 30%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: color 120ms ease;
	}

	.f-button:hover:not(:disabled) {
		color: var(--color-primary-light);
	}

	.f-button:disabled {
		opacity: 0.35;
		cursor: default;
	}

	/* home gets its own pill treatment instead of a plain icon like lock/back */
	.f-home {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.18);
		background: rgba(255, 255, 255, 0.08);
		color: var(--color-text);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition:
			background 120ms ease,
			border-color 120ms ease;
	}

	.f-home:hover {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}
</style>
