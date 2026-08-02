<!-- physical phone frame + wallpaper + Header/Alerts/Popups/Footer chrome, every screen renders inside this -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Header from '../components/Header.svelte';
	import Footer from '../components/Footer.svelte';
	import Alerts from '../components/Alerts.svelte';
	import Popups from '../components/Popups.svelte';
	import RaceHud from '../components/RaceHud.svelte';
	import ControlCenter from '../components/ControlCenter.svelte';
	import { dataState } from '../store/data.svelte';
	import { navState } from '../store/nav.svelte';
	import { shellState } from '../store/shell.svelte';
	import { getPhoneCaseImage, getPhoneCaseCutout, getWallpaperImage } from '../../config';

	// peek: true when this is the shrunk outside-phone banner, forwarded to Popups to collapse the list
	let { children, peek = false }: { children: Snippet; peek?: boolean } = $props();

	const frameImage = $derived(getPhoneCaseImage(dataState.player?.PhoneCase));
	const cutout = $derived(getPhoneCaseCutout(dataState.player?.PhoneCase));
	const wallpaperImage = $derived(getWallpaperImage(dataState.player?.PhoneSettings.wallpaper));
	// peek always passes Home as children regardless of navState.app, so it counts as home too
	const onHome = $derived(peek || navState.app === null);
</script>

<div class="phone-case">
	<img class="frame" src={frameImage} alt="" />
	<div
		class="phone"
		style:left={`${cutout.left}%`}
		style:top={`${cutout.top}%`}
		style:width={`${100 - cutout.left - cutout.right}%`}
		style:height={`${100 - cutout.top - cutout.bottom}%`}
		style:--phone-radius={`${cutout.radius}px`}
	>
		<img class="wallpaper" src={wallpaperImage} alt="" />
		<Header />
		{#if shellState.visible}
			<Alerts />
		{/if}
		{#if onHome}
			<div class="overlay-stack">
				<RaceHud />
				<Popups collapsed={peek} />
			</div>
		{/if}
		<ControlCenter />
		<div class="screen">
			{@render children()}
		</div>
		<Footer />
	</div>
</div>

<style>
	.phone-case {
		position: relative;
		height: 100%;
		width: 100%;
	}

	/* frame PNGs are exactly 500x1000, a 1:1 match for the phone's base canvas */
	.frame {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		user-select: none;
		z-index: 10;
	}

	/* left/top/right/bottom + --phone-radius come from config.ts's measured per-case cutout, bezel size varies by case */
	.phone {
		position: absolute;
		overflow: hidden;
		border-radius: var(--phone-radius);
		display: flex;
		flex-direction: column;
		pointer-events: auto;
	}

	.wallpaper {
		height: 100%;
		width: 100%;
		position: absolute;
		object-fit: cover;
		z-index: -1;
		border-radius: var(--phone-radius);
		user-select: none;
	}

	.screen {
		flex: 1;
		overflow: hidden;
		width: 100%;
		position: relative;
	}

	/* shared stack for RaceHud + Popups so they don't overlap */
	.overlay-stack {
		position: absolute;
		width: 92%;
		top: 4%;
		left: 0;
		right: 0;
		margin: auto;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
</style>
