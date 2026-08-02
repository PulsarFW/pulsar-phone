<!-- status bar: signal, position lock, limited-mode indicator, active-call label, clock, battery -->
<script lang="ts">
	import Icon from './Icon.svelte';
	import {
		shellState,
		toggleLocked,
		toggleControlCenter,
		openControlCenter,
		closeControlCenter,
		startControlCenterDrag,
		setControlCenterDragProgress,
	} from '../store/shell.svelte';
	import { phoneState } from '../store/phone.svelte';
	import { navigateToApp, navState } from '../store/nav.svelte';
	import { pushAlert } from '../store/alerts.svelte';
	import { notificationsState } from '../store/notifications.svelte';
	import { dataState } from '../store/data.svelte';
	import { CORE_APPS, hexToRgb } from '../../config';

	// tints to the current app's color, transparent on home over the wallpaper
	const currentApp = $derived(navState.app ? (dataState.appRegistry[navState.app] ?? CORE_APPS.find((a) => a.name === navState.app)) : null);
	const headerTint = $derived.by(() => {
		if (navState.app === null) return 'transparent';
		if (!currentApp?.color) return 'var(--color-secondary)';
		const [r, g, b] = hexToRgb(currentApp.color);
		return `rgba(${r}, ${g}, ${b}, 0.22)`;
	});

	// fixed drag distance to fully reveal the control center
	const DRAG_REVEAL_PX = 220;

	const clockText = $derived(`${String(shellState.time.hour).padStart(2, '0')}:${String(shellState.time.minute).padStart(2, '0')}`);

	let now = $state(Math.floor(Date.now() / 1000));
	$effect(() => {
		const i = setInterval(() => (now = Math.floor(Date.now() / 1000)), 1000);
		return () => clearInterval(i);
	});

	const callLabel = $derived.by(() => {
		const call = phoneState.call;
		if (!call) return null;
		if (call.state === 0) return 'Calling';
		if (call.state === 1) return 'Call Incoming';
		const elapsed = Math.max(0, now - (call.startedAt ?? now));
		const h = Math.floor(elapsed / 3600);
		const m = Math.floor((elapsed % 3600) / 60);
		const s = elapsed % 60;
		const time = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
		return `Call Active ${time}`;
	});

	function onLock() {
		toggleLocked();
		pushAlert(shellState.locked ? 'Phone Position Locked' : 'Phone Position Unlocked - Drag To Move');
	}

	function onCallClick() {
		if (phoneState.call) navigateToApp('phone', `call/${phoneState.call.number}`);
	}

	const onCallScreen = $derived(navState.app === 'phone' && navState.route.startsWith('call'));

	function onBell() {
		toggleControlCenter();
	}

	// pull-down-to-reveal gesture, only commits after a few px of mostly-vertical movement
	let dragStartY = 0;
	let dragStartX = 0;
	let dragPointerId: number | null = null;
	let dragCommitted = false;

	// window-tracked, matches Shell.svelte's own drag gesture
	function onHeaderPointerDown(e: PointerEvent) {
		if ((e.target as HTMLElement).closest('button')) return;
		if (e.button !== 0) return;
		dragStartY = e.clientY;
		dragStartX = e.clientX;
		dragPointerId = e.pointerId;
		dragCommitted = false;
		window.addEventListener('pointermove', onHeaderPointerMove);
		window.addEventListener('pointerup', onHeaderPointerUp);
		window.addEventListener('pointercancel', onHeaderPointerUp);
	}

	function onHeaderPointerMove(e: PointerEvent) {
		if (dragPointerId === null || e.pointerId !== dragPointerId) return;
		const deltaY = e.clientY - dragStartY;
		const deltaX = e.clientX - dragStartX;
		if (!dragCommitted) {
			if (Math.abs(deltaY) < 8 || Math.abs(deltaX) > Math.abs(deltaY)) return;
			dragCommitted = true;
			startControlCenterDrag();
		}
		e.preventDefault();
		const base = shellState.controlCenter.open ? 1 : 0;
		setControlCenterDragProgress(base + deltaY / DRAG_REVEAL_PX);
	}

	function onHeaderPointerUp(e: PointerEvent) {
		window.removeEventListener('pointermove', onHeaderPointerMove);
		window.removeEventListener('pointerup', onHeaderPointerUp);
		window.removeEventListener('pointercancel', onHeaderPointerUp);
		if (dragPointerId === null || e.pointerId !== dragPointerId) return;
		if (dragCommitted) {
			if (shellState.controlCenter.dragProgress > 0.4) openControlCenter();
			else closeControlCenter();
		}
		dragPointerId = null;
		dragCommitted = false;
	}
</script>

<div
	class="header"
	class:transparent={navState.app === null && !shellState.visible}
	style:--header-tint={headerTint}
	role="toolbar"
	aria-label="Status bar - drag down for control center"
	tabindex="-1"
	onpointerdown={onHeaderPointerDown}
>
	<div class="left">
		<span class="icon"><Icon name="signal" size="18px" /></span>
		<button class="icon clickable" onclick={onLock} aria-label="Toggle position lock">
			<Icon name={shellState.locked ? 'floppy-disk' : 'unlock'} size="18px" />
		</button>
		{#if shellState.limited}
			<span class="icon warning"><Icon name="wifi-slash" size="18px" /></span>
		{/if}
		{#if callLabel && !onCallScreen}
			<button class="call-active" onclick={onCallClick}>{callLabel}</button>
		{/if}
	</div>
	<div class="right">
		<button class="icon clickable" onclick={onBell} aria-label="Notifications">
			<Icon name="bell" size="18px" />
			{#if notificationsState.list.length > 0}
				<span class="bell-dot"></span>
			{/if}
		</button>
		<span class="clock">{clockText}</span>
		<Icon name="battery-three-quarters" size="21px" />
	</div>
</div>

<style>
	/* floats over the wallpaper/app content, soft top-down scrim for icon legibility */
	.header {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 40px;
		flex-shrink: 0;
		padding: 0 18px;
		font-size: 14px;
		color: var(--color-text-alt);
		user-select: none;
		touch-action: none;
		border-top-left-radius: var(--phone-radius, 20px);
		border-top-right-radius: var(--phone-radius, 20px);
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	}

	.header::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		border-top-left-radius: inherit;
		border-top-right-radius: inherit;
		/* dark scrim over the app's tint color, transparent on home */
		background:
			linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.08) 75%, rgba(0, 0, 0, 0) 100%),
			var(--header-tint, transparent);
		transition:
			opacity 150ms ease,
			background 200ms ease;
	}

	.header.transparent::before {
		opacity: 0;
	}

	.left {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.right {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--color-text);
	}

	/* tabular figures so the digits don't jitter in width */
	.clock {
		font-size: 15px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.02em;
	}

	.icon {
		display: flex;
		align-items: center;
		color: inherit;
		position: relative;
	}

	.bell-dot {
		position: absolute;
		top: -2px;
		right: -2px;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-error);
	}

	.icon.clickable {
		background: none;
		border: none;
		cursor: pointer;
		color: inherit;
		padding: 0;
	}

	.icon.clickable:hover {
		color: var(--color-primary);
	}

	.icon.warning {
		color: var(--color-warning);
	}

	.call-active {
		background: none;
		border: none;
		color: var(--color-text);
		font-size: 12px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		cursor: pointer;
	}
</style>
