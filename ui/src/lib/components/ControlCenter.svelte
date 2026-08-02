<!-- pull-down notification shade + quick toggles, drag state comes from shellState.controlCenter -->
<script lang="ts">
	import Icon from './Icon.svelte';
	import { dataState, updatePlayerSetting } from '../store/data.svelte';
	import { shellState, closeControlCenter, openControlCenter, startControlCenterDrag, setControlCenterDragProgress } from '../store/shell.svelte';
	import { notificationsState, dismissNotification, dismissAllNotifications } from '../store/notifications.svelte';
	import { navigateToApp } from '../store/nav.svelte';
	import { Nui } from '../nui';
	import type { PhoneNotification } from '../types';

	const settings = $derived(dataState.player?.PhoneSettings);
	const silent = $derived(settings?.volume === 0);

	// dragging is tracked explicitly since a drag can start from either open or closed
	const progress = $derived(shellState.controlCenter.open || shellState.controlCenter.dragProgress > 0 ? shellState.controlCenter.dragProgress : 0);
	const dragging = $derived(shellState.controlCenter.dragging);

	function setSetting<K extends string>(key: K, value: unknown) {
		updatePlayerSetting(key as never, value as never);
		Nui.updateSetting(key, value);
	}

	function toggleNotifications() {
		if (!settings) return;
		setSetting('notifications', !settings.notifications);
	}

	function toggleSilent() {
		if (!settings) return;
		setSetting('volume', silent ? 100 : 0);
	}

	const sorted = $derived([...notificationsState.list].sort((a, b) => b.time - a.time));

	function appIcon(app: PhoneNotification['app']): string {
		if (typeof app === 'object') return app.icon;
		const icon = dataState.appRegistry[app]?.icon;
		if (!icon) return 'bell';
		return typeof icon === 'string' ? icon : icon[1];
	}

	function appColor(app: PhoneNotification['app']): string {
		if (typeof app === 'object') return app.color;
		return dataState.appRegistry[app]?.color ?? '#18191e';
	}

	function timeAgo(unixSeconds: number): string {
		const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
		if (diff < 60) return 'now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
		return `${Math.floor(diff / 86400)}d`;
	}

	function onOpenNotif(n: PhoneNotification) {
		const appName = typeof n.app === 'object' ? undefined : n.app;
		closeControlCenter();
		if (!appName) return;
		navigateToApp(appName, (n.action?.view as string | undefined) ?? '');
	}

	// drag the grip handle back up to close, mirrors Header.svelte's pull-down-to-open gesture
	const GRIP_DRAG_PX = 180;
	let gripStartY = 0;
	let gripPointerId: number | null = null;

	// window-tracked, matches Header.svelte's pull-down gesture
	function onGripPointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		gripStartY = e.clientY;
		gripPointerId = e.pointerId;
		startControlCenterDrag();
		window.addEventListener('pointermove', onGripPointerMove);
		window.addEventListener('pointerup', onGripPointerUp);
		window.addEventListener('pointercancel', onGripPointerUp);
	}

	function onGripPointerMove(e: PointerEvent) {
		if (gripPointerId === null || e.pointerId !== gripPointerId) return;
		const deltaY = e.clientY - gripStartY;
		setControlCenterDragProgress(1 + deltaY / GRIP_DRAG_PX);
	}

	function onGripPointerUp(e: PointerEvent) {
		window.removeEventListener('pointermove', onGripPointerMove);
		window.removeEventListener('pointerup', onGripPointerUp);
		window.removeEventListener('pointercancel', onGripPointerUp);
		if (gripPointerId === null || e.pointerId !== gripPointerId) return;
		if (shellState.controlCenter.dragProgress > 0.6) openControlCenter();
		else closeControlCenter();
		gripPointerId = null;
	}
</script>

{#if progress > 0}
	<button class="backdrop" style:opacity={progress} onclick={closeControlCenter} aria-label="Close control center"></button>
{/if}
<div
	class="panel"
	class:dragging
	class:closed={progress === 0 && !dragging}
	style:transform={`translateY(${(progress - 1) * 100}%)`}
>
	<div
		class="grip"
		role="slider"
		aria-label="Drag to close"
		aria-valuenow={Math.round(progress * 100)}
		aria-valuemin={0}
		aria-valuemax={100}
		tabindex="0"
		onpointerdown={onGripPointerDown}
		onpointermove={onGripPointerMove}
		onpointerup={onGripPointerUp}
		onpointercancel={onGripPointerUp}
	></div>
	<div class="toggles">
		<button class="toggle-btn" class:active={settings?.notifications} onclick={toggleNotifications}>
			<span class="toggle-icon"><Icon name={settings?.notifications ? 'bell' : 'bell-slash'} size="16px" /></span>
			<span class="toggle-label">Notifications</span>
		</button>
		<button class="toggle-btn" class:active={silent} onclick={toggleSilent}>
			<span class="toggle-icon"><Icon name={silent ? 'volume-xmark' : 'volume-high'} size="16px" /></span>
			<span class="toggle-label">{silent ? 'Silent' : 'Sound'}</span>
		</button>
	</div>
	<div class="notif-header">
		<span>Notifications</span>
		{#if sorted.length > 0}
			<button class="clear-all" onclick={dismissAllNotifications}>Clear All</button>
		{/if}
	</div>
	<div class="notif-rows">
		{#if sorted.length === 0}
			<div class="empty">No Notifications</div>
		{/if}
		{#each sorted as n (n.id)}
			<div class="notif-row">
				<button class="notif-main" onclick={() => onOpenNotif(n)}>
					<span class="notif-badge" style:background={appColor(n.app)}>
						<Icon name={appIcon(n.app)} size="15px" />
					</span>
					<span class="notif-text">
						<span class="notif-top">
							<span class="notif-title">{n.title}</span>
							<span class="notif-time">{timeAgo(n.time)}</span>
						</span>
						{#if n.description}<span class="notif-desc">{n.description}</span>{/if}
					</span>
				</button>
				{#if n.duration !== -1}
					<button class="notif-dismiss" onclick={() => dismissNotification(n.id!)} aria-label="Dismiss"><Icon name="xmark" size="11px" /></button>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		border: none;
		padding: 0;
		z-index: 900;
		cursor: pointer;
	}

	/* flush against all three edges, top corners match var(--phone-radius) */
	.panel {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 901;
		max-height: 78%;
		display: flex;
		flex-direction: column;
		background: rgba(24, 25, 30, 0.96);
		border-radius: var(--phone-radius, 20px) var(--phone-radius, 20px) var(--radius-lg) var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 10px 14px 8px;
		/* visibility switches instantly on open, delayed 220ms on close to match the slide animation */
		visibility: visible;
		transition:
			transform 220ms ease,
			visibility 0s linear 0s;
	}

	.panel.closed {
		visibility: hidden;
		transition:
			transform 220ms ease,
			visibility 0s linear 220ms;
	}

	.panel.dragging {
		transition: none;
	}

	.grip {
		width: 60px;
		height: 18px;
		display: flex;
		align-items: center;
		margin: 0 auto 4px;
		cursor: grab;
		touch-action: none;
	}

	.grip::after {
		content: '';
		width: 36px;
		height: 4px;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.25);
		margin: 0 auto;
	}

	.toggles {
		display: flex;
		gap: 10px;
		margin-bottom: 10px;
		flex-shrink: 0;
	}

	/* circular icon badge + rounded surface, matches SettingsApp's grouped rows */
	.toggle-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		background: rgba(255, 255, 255, 0.05);
		border: none;
		border-radius: var(--radius-lg);
		padding: 10px 6px 9px;
		cursor: pointer;
	}

	.toggle-icon {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.08);
		color: var(--color-text-muted);
	}

	.toggle-label {
		font-size: 10.5px;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.toggle-btn.active .toggle-icon {
		background: var(--color-primary);
		color: #fff;
	}

	.toggle-btn.active .toggle-label {
		color: var(--color-text);
	}

	.notif-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 11px;
		color: var(--color-text-alt);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		flex-shrink: 0;
		padding: 4px 2px;
	}

	.clear-all {
		background: none;
		border: none;
		color: var(--color-primary);
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
		text-transform: none;
	}

	.notif-rows {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-bottom: 2px;
	}

	.empty {
		text-align: center;
		padding: 16px 0;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.notif-row {
		display: flex;
		align-items: center;
		gap: 2px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: var(--radius-lg);
	}

	.notif-main {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 10px;
		background: none;
		border: none;
		padding: 8px 8px 8px 6px;
		cursor: pointer;
		text-align: left;
		min-width: 0;
	}

	.notif-badge {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
	}

	.notif-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: 1px;
	}

	.notif-top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}

	.notif-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.notif-time {
		flex-shrink: 0;
		font-size: 10.5px;
		color: var(--color-text-muted);
	}

	.notif-desc {
		font-size: 12.5px;
		color: var(--color-text-alt);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.notif-dismiss {
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 8px 10px;
	}

	.notif-dismiss:hover {
		color: var(--color-error-light, var(--color-error));
	}
</style>
