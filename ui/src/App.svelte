<script lang="ts">
	import { onMount } from 'svelte';
	import { attachMessageListener } from './lib/messages';
	import { Nui } from './lib/nui';
	import Shell from './lib/containers/Shell.svelte';
	import DevMenu from './lib/components/DevMenu.svelte';
	import { dataState } from './lib/store/data.svelte';
	import { applyAccentColor } from './config';

	onMount(() => {
		const detach = attachMessageListener();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') Nui.close();
		};
		window.addEventListener('keydown', onKey);
		return () => {
			detach();
			window.removeEventListener('keydown', onKey);
		};
	});

	$effect(() => {
		applyAccentColor(dataState.player?.PhoneSettings.colors.accent);
	});
</script>

<main>
	<Shell />
	{#if import.meta.env.DEV}
		<DevMenu />
	{/if}
</main>

<style>
	main {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
	}
</style>
