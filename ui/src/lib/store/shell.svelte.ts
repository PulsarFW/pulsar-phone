// phone chrome/visibility state: open/closed, limited (payphone/call-only) mode, position, clock, expanded layout

import { Nui } from '../nui';
import { forceApp } from './nav.svelte';

export interface GameTime {
	hour: number;
	minute: number;
}

export const shellState = $state({
	visible: false,
	limited: false,
	forcedClosed: false,
	expanded: false,
	locked: true,
	position: { x: 1000, y: 250 },
	time: { hour: 12, minute: 0 } as GameTime,
	navResetToken: 0,
	controlCenter: { open: false, dragProgress: 0, dragging: false },
});

// position drag-to-move isn't implemented in Phase 0 (cosmetic lock toggle only), save whatever's current
export function toggleLocked() {
	shellState.locked = !shellState.locked;
}

export function openControlCenter() {
	shellState.controlCenter = { open: true, dragProgress: 1, dragging: false };
}

export function closeControlCenter() {
	shellState.controlCenter = { open: false, dragProgress: 0, dragging: false };
}

export function toggleControlCenter() {
	if (shellState.controlCenter.open) closeControlCenter();
	else openControlCenter();
}

export function startControlCenterDrag() {
	shellState.controlCenter = { ...shellState.controlCenter, dragging: true };
}

export function setControlCenterDragProgress(progress: number) {
	shellState.controlCenter = { ...shellState.controlCenter, dragProgress: Math.max(0, Math.min(1, progress)) };
}

// safety net for a drag whose pointerup/pointercancel never arrives (seen in the NUI/CEF browser when the
// game toggles input focus mid-gesture) - without this, `dragging` stays true forever and the panel's CSS
// transition (disabled while dragging, see ControlCenter's .panel.dragging rule) never re-enables, so it
// visually freezes wherever the last pointermove left it instead of snapping open or closed
export function resolveControlCenterDrag() {
	if (!shellState.controlCenter.dragging) return;
	if (shellState.controlCenter.dragProgress > 0.5) openControlCenter();
	else closeControlCenter();
}

if (typeof window !== 'undefined') {
	window.addEventListener('blur', resolveControlCenterDrag);
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) resolveControlCenterDrag();
	});
}

export function handleShellMessage(type: string, data: Record<string, unknown>) {
	switch (type) {
		case 'PHONE_VISIBLE':
			shellState.visible = true;
			shellState.limited = false;
			shellState.forcedClosed = false;
			break;
		case 'PHONE_VISIBLE_LIMITED':
			shellState.visible = true;
			shellState.limited = true;
			shellState.forcedClosed = false;
			forceApp('phone');
			break;
		case 'PHONE_NOT_VISIBLE':
			shellState.visible = false;
			Nui.cdExpired();
			break;
		case 'PHONE_NOT_VISIBLE_FORCED':
			shellState.visible = false;
			shellState.forcedClosed = true;
			Nui.cdExpired();
			break;
		case 'CLEAR_HISTORY':
			shellState.navResetToken++;
			break;
		case 'SET_POSITION':
			shellState.position = { x: data.x as number, y: data.y as number };
			break;
		case 'SET_TIME':
			shellState.time = data as unknown as GameTime;
			break;
		case 'SET_EXPANDED':
			shellState.expanded = Boolean(data.expanded);
			break;
	}
}
