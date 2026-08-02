// active call state, mirrors client/apps/phone.lua's _call table: state 0 dialing, 1 incoming, 2 active

import type { CallState } from '../types';

export const phoneState = $state({
	call: null as CallState | null,
});

export function handlePhoneMessage(type: string, data: Record<string, unknown>) {
	switch (type) {
		case 'SET_CALL_PENDING':
			phoneState.call = { id: 0, state: 0, number: data.number as string, duration: -1, method: 1 };
			break;
		case 'SET_CALL_INCOMING':
			phoneState.call = { id: 0, state: 1, number: data.number as string, duration: -1, method: 0, limited: Boolean(data.limited) };
			break;
		case 'SET_CALL_ACTIVE':
			if (phoneState.call) phoneState.call = { ...phoneState.call, state: 2, duration: 0, startedAt: Math.floor(Date.now() / 1000) };
			break;
		case 'END_CALL':
			phoneState.call = null;
			break;
	}
}
