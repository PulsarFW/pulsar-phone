<!-- imports the full fas icon pack and builds a kebab-case lookup, icon names come from server/data.lua's app registry -->
<script lang="ts">
	import { fas } from '@fortawesome/free-solid-svg-icons';
	import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

	const ICONS: Record<string, IconDefinition> = {};
	for (const icon of Object.values(fas)) {
		ICONS[icon.iconName] = icon;
	}

	let { name, size = '1em' }: { name: string; size?: string } = $props();

	const icon = $derived(ICONS[name] ?? fas.faCircleQuestion);
	const path = $derived(icon.icon[4] as string);
	const viewBox = $derived(`0 0 ${icon.icon[0]} ${icon.icon[1]}`);
</script>

<svg {viewBox} width={size} height={size} fill="currentColor" aria-hidden="true">
	<path d={path} />
</svg>
