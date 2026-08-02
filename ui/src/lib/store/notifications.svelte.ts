import type { PhoneNotification } from '../types';

export const notificationsState = $state({
	list: [] as PhoneNotification[],
});

let nextId = 1;
const fadeTimers = new Map<string | number, ReturnType<typeof setTimeout>>();

function clearFadeTimer(id: string | number) {
	const t = fadeTimers.get(id);
	if (t) {
		clearTimeout(t);
		fadeTimers.delete(id);
	}
}

function scheduleFade(notif: PhoneNotification) {
	if (notif.id == null || notif.duration === -1) return;
	clearFadeTimer(notif.id);
	// time is unix seconds, duration is ms (matches client/component.lua's Notification:Add signature)
	const remaining = notif.time * 1000 + notif.duration - Date.now();
	const id = notif.id;
	fadeTimers.set(
		id,
		setTimeout(() => {
			fadeTimers.delete(id);
			hideNotification(id);
		}, Math.max(0, remaining)),
	);
}

// local-only fade: marks show:false but keeps the entry in the list (still visible in the control
// center's history) - used by the auto-fade timer above and by Popups.svelte after accept/cancel/view
export function hideNotification(id: string | number) {
	clearFadeTimer(id);
	notificationsState.list = notificationsState.list.map((n) => (n.id === id ? { ...n, show: false } : n));
}

// duration: -1 entries (e.g. pulsar_labor's task tracker) can't be dismissed, no Lua roundtrip otherwise
export function dismissNotification(id: string | number) {
	if (notificationsState.list.some((n) => n.id === id && n.duration === -1)) return;
	clearFadeTimer(id);
	notificationsState.list = notificationsState.list.filter((n) => n.id !== id);
}

export function dismissAllNotifications() {
	for (const [id, n] of notificationsState.list.map((n) => [n.id, n] as const)) {
		if (n.duration !== -1) clearFadeTimer(id!);
	}
	notificationsState.list = notificationsState.list.filter((n) => n.duration === -1);
}

export function handleNotificationsMessage(type: string, data: Record<string, unknown>) {
	switch (type) {
		case 'NOTIF_ADD': {
			const notif = data.notification as PhoneNotification;
			const withId = { ...notif, id: notif.id ?? nextId++ };
			if (notificationsState.list.some((n) => n.id === withId.id)) {
				notificationsState.list = notificationsState.list.map((n) => (n.id === withId.id ? withId : n));
			} else {
				notificationsState.list = [withId, ...notificationsState.list];
			}
			scheduleFade(withId);
			break;
		}
		case 'NOTIF_UPDATE': {
			const id = data.id as string | number;
			notificationsState.list = notificationsState.list.map((n) =>
				n.id === id ? { ...n, title: data.title as string, description: data.description as string } : n,
			);
			break;
		}
		case 'NOTIF_HIDE':
			hideNotification(data.id as string | number);
			break;
		case 'NOTIF_DISMISS_ALL':
			dismissAllNotifications();
			break;
	}
}
