export interface PhoneAlert {
	id: number;
	message: string;
	kind: 'error' | 'success' | 'info';
}

export const alertsState = $state({
	list: [] as PhoneAlert[],
});

let nextId = 1;

export function pushAlert(message: string, kind: PhoneAlert['kind'] = 'info', durationMs = 3000) {
	const id = nextId++;
	alertsState.list = [...alertsState.list, { id, message, kind }];
	setTimeout(() => dismissAlert(id), durationMs);
}

export function dismissAlert(id: number) {
	alertsState.list = alertsState.list.filter((a) => a.id !== id);
}

export function handleAlertsMessage(type: string) {
	if (type === 'ALERTS_RESET') alertsState.list = [];
}
