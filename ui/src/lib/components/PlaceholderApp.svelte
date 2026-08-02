<!-- last-resort fallback for an installed app with no dedicated file (e.g. a server owner's own custom app
	 added to server/data.lua) - every app that ships with the framework gets its own file in lib/apps/<name>/,
	 this only covers the unknown case -->
<script lang="ts">
	import AppContainer from '../primitives/AppContainer.svelte';
	import ComingSoon from '../primitives/ComingSoon.svelte';
	import { dataState } from '../store/data.svelte';
	import { CORE_APPS, type PhoneApp } from '../../config';

	let { appId }: { appId: string } = $props();

	const app = $derived(dataState.appRegistry[appId] ?? CORE_APPS.find((a) => a.name === appId));

	function iconName(a: PhoneApp): string {
		return typeof a.icon === 'string' ? a.icon : a.icon[1];
	}
</script>

<AppContainer {appId} useAppColor={true}>
	<ComingSoon
		name={app ? iconName(app) : 'circle-question'}
		color={app?.color ?? '#1f2937'}
		description={`${app?.storeLabel ?? appId} isn't built yet - check back in a future update.`}
	/>
</AppContainer>
