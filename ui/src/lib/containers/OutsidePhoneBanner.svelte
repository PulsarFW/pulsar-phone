<!-- peeks the real phone up from the bottom-right corner when closed, mostly parked below the screen edge -->
<script lang="ts">
	import PhoneCase from './PhoneCase.svelte';
	import Home from '../components/Home.svelte';
	import { notificationsState } from '../store/notifications.svelte';
	import { dataState } from '../store/data.svelte';
	import { trackState } from '../store/track.svelte';

	const BASE_WIDTH = 500;
	const BASE_HEIGHT = 1000;

	// same zoom-driven scale Shell.svelte uses for the real phone
	const zoom = $derived(dataState.player?.PhoneSettings.zoom ?? 75);
	const scale = $derived(zoom / 100);
	// floor, not the raw product - see Shell.svelte's boxWidth/boxHeight for why
	const boxWidth = $derived(Math.floor(BASE_WIDTH * scale));
	const boxHeight = $derived(Math.floor(BASE_HEIGHT * scale));

	const visibleCount = $derived(
		notificationsState.list.filter((n) => n.show && (typeof n.app === 'object' || Boolean(dataState.appRegistry[n.app]))).length,
	);

	// active race takes priority over notification count, -200 is the resting baseline sliver
	const marginBottomBase = $derived.by(() => {
		if (trackState.show) return trackState.dnf ? -15 : trackState.isLaps ? 100 : 15;
		if (visibleCount > 0) return visibleCount > 1 ? 48 : 35;
		return -200;
	});
	// scaled by zoom so the reveal always lines up with the card behind it, same as boxWidth/boxHeight above
	const marginBottom = $derived(marginBottomBase * scale);
</script>

<div class="banner" style:width={`${boxWidth}px`} style:height={`${boxHeight}px`} style:bottom={`${-800 * scale}px`} style:margin-bottom={`${marginBottom}px`}>
	<div class="banner-scale" style:transform={`scale(${scale})`}>
		<PhoneCase peek={true}>
			<Home />
		</PhoneCase>
	</div>
</div>

<style>
	.banner {
		position: absolute;
		right: 1%;
		overflow: hidden;
		transition: margin 150ms linear;
		border-radius: 40px;
		pointer-events: none;
	}

	.banner-scale {
		width: 500px;
		height: 1000px;
		transform-origin: top left;
	}

	.banner :global(.phone-case) {
		pointer-events: none;
	}
</style>
