<!-- app icon badge: gradient + glow + border derived from the app's own color - `glow` scales the shadow
	 intensity down for dense list contexts (Store rows) where a full glow on every row looks noisy -->
<script lang="ts">
	import Icon from './Icon.svelte';
	import { adjustColor, hexToRgb } from '../../config';

	let { name, color, size = 48, glow = 1 }: { name: string; color: string; size?: number; glow?: number } = $props();

	const gradient = $derived(`linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -30)} 100%)`);
	const shadow = $derived.by(() => {
		const [r1, g1, b1] = hexToRgb(adjustColor(color, -40));
		const [r2, g2, b2] = hexToRgb(adjustColor(color, -20));
		return `0 3px ${8 * glow}px rgba(${r1}, ${g1}, ${b1}, ${0.5 * glow}), 0 0 ${12 * glow}px rgba(${r2}, ${g2}, ${b2}, ${0.25 * glow})`;
	});
	const border = $derived(`1px solid ${adjustColor(color, 30)}`);
	const iconSize = $derived(`${Math.round(size * 0.42)}px`);
</script>

<span class="app-icon" style:width={`${size}px`} style:height={`${size}px`} style:background={gradient} style:box-shadow={shadow} style:border>
	<Icon {name} size={iconSize} />
</span>

<style>
	.app-icon {
		border-radius: 30%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		flex-shrink: 0;
	}
</style>
