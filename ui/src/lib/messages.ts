// central NUI message router, forwards SendNUIMessage calls to whichever store module owns the type

import { handleShellMessage } from './store/shell.svelte';
import { handleDataMessage } from './store/data.svelte';
import { handlePhoneMessage } from './store/phone.svelte';
import { handleMessagesMessage } from './store/messages.svelte';
import { handleNotificationsMessage } from './store/notifications.svelte';
import { handleAlertsMessage } from './store/alerts.svelte';
import { handleMusicMessage } from './store/music.svelte';
import { handleChatterMessage } from './store/chatter.svelte';
import { handleBluelineMessage } from './store/blueline.svelte';
import { handleRedlineMessage } from './store/redline.svelte';
import { handleTrackMessage } from './store/track.svelte';

interface InboundMessage {
	type?: string;
	data?: unknown;
}

function route(type: string, data: unknown) {
	const record = (data ?? {}) as Record<string, unknown>;
	handleShellMessage(type, record);
	handleDataMessage(type, record);
	handlePhoneMessage(type, record);
	handleMessagesMessage(type, record);
	handleNotificationsMessage(type, record);
	handleAlertsMessage(type);
	handleMusicMessage(type, record);
	handleChatterMessage(type, record);
	handleBluelineMessage(type, record);
	handleRedlineMessage(type, record);
	handleTrackMessage(type, record);
}

/** Returns an unsubscribe function */
export function attachMessageListener(): () => void {
	const handler = (event: MessageEvent<InboundMessage>) => {
		if (!event.isTrusted) return;
		if (event.data?.type) route(event.data.type, event.data.data);
	};
	window.addEventListener('message', handler);
	return () => window.removeEventListener('message', handler);
}

export { route as applyMessage };
