<!-- stacked in-phone notification cards, only rendered on the home screen -->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import Icon from './Icon.svelte';
	import { notificationsState, hideNotification } from '../store/notifications.svelte';
	import { dataState } from '../store/data.svelte';
	import { navigateToApp } from '../store/nav.svelte';
	import { Nui } from '../nui';
	import type { PhoneNotification } from '../types';

	// collapsed=true is the outside-phone peek's display mode, shows only the top card plus stacked edges
	let { collapsed = false }: { collapsed?: boolean } = $props();

	function appLabel(app: PhoneNotification['app']): string {
		if (typeof app === 'object') return app.label;
		return dataState.appRegistry[app]?.storeLabel ?? app;
	}

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

	const visible = $derived(
		notificationsState.list
			.filter((n) => n.show)
			.sort((a, b) => b.time - a.time)
			.slice(0, 5),
	);

	function onView(n: PhoneNotification) {
		const view = n.action?.view as string | undefined;
		const appName = typeof n.app === 'object' ? undefined : n.app;
		// duration:-1 popups are task notifications (workgroup/hire offers etc) - viewing them is just a
		// shortcut to the relevant app screen, not a completed interaction, so they stay pinned until
		// explicitly accepted/cancelled.
		if (n.id != null && n.duration !== -1) hideNotification(n.id);
		if (appName && view) navigateToApp(appName, view);
	}

	function onAccept(n: PhoneNotification) {
		if (n.id != null) hideNotification(n.id);
		Nui.acceptPopup(n.action?.accept as string, n.data);
	}

	function onCancel(n: PhoneNotification) {
		if (n.id != null) hideNotification(n.id);
		Nui.cancelPopup(n.action?.cancel as string, n.data);
	}
</script>

{#if collapsed}
	{#if visible.length > 0}
		<div class="popups">
			<div class="popup">
				<span class="popup-badge" style:background={appColor(visible[0].app)}>
					<Icon name={appIcon(visible[0].app)} size="16px" />
				</span>
				<div class="popup-body">
					<div class="popup-top">
						<span class="popup-app">{appLabel(visible[0].app)}</span>
						<span class="popup-time">{timeAgo(visible[0].time)}</span>
					</div>
					<div class="popup-title">{visible[0].title}</div>
					{#if visible[0].description}
						<div class="popup-desc">{visible[0].description}</div>
					{/if}
				</div>
			</div>
			{#if visible.length > 1}<div class="popup-stub"></div>{/if}
			{#if visible.length > 2}<div class="popup-stub small"></div>{/if}
		</div>
	{/if}
{:else}
	<div class="popups">
		{#each visible as n (n.id)}
			<div class="popup" transition:slide={{ duration: 200 }}>
				<span class="popup-badge" style:background={appColor(n.app)}>
					<Icon name={appIcon(n.app)} size="16px" />
				</span>
				<div class="popup-body">
					<div class="popup-top">
						<span class="popup-app">{appLabel(n.app)}</span>
						<span class="popup-time">{timeAgo(n.time)}</span>
					</div>
					<div class="popup-title">{n.title}</div>
					{#if n.description}
						<div class="popup-desc">{n.description}</div>
					{/if}
					{#if n.action?.view || n.action?.accept || n.action?.cancel}
						<div class="popup-actions">
							{#if n.action?.cancel}
								<button class="popup-btn cancel" onclick={() => onCancel(n)}>Decline</button>
							{/if}
							{#if n.action?.view}
								<button class="popup-btn view" onclick={() => onView(n)}>View</button>
							{/if}
							{#if n.action?.accept}
								<button class="popup-btn accept" onclick={() => onAccept(n)}>Accept</button>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	/* positioning lives on PhoneCase's .overlay-stack wrapper, shared with RaceHud */
	.popups {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* collapsed mode: extra notifications show as thin stacked-deck edges */
	.popup-stub {
		align-self: center;
		width: 94%;
		height: 10px;
		margin-top: -6px;
		background: rgba(24, 25, 30, 0.75);
		border-radius: 0 0 12px 12px;
		box-shadow: var(--shadow-card);
	}

	.popup-stub.small {
		width: 88%;
		margin-top: -4px;
		opacity: 0.7;
	}

	/* circular icon badge + rounded card, matches ControlCenter/SettingsApp */
	.popup {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px;
		background: rgba(24, 25, 30, 0.92);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
	}

	.popup-badge {
		flex-shrink: 0;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
	}

	.popup-body {
		flex: 1;
		min-width: 0;
	}

	.popup-top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}

	.popup-app {
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		font-size: 10.5px;
		font-weight: 600;
	}

	.popup-time {
		flex-shrink: 0;
		color: var(--color-text-muted);
		font-size: 10.5px;
	}

	.popup-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-top: 1px;
	}

	.popup-desc {
		font-size: 13.5px;
		color: var(--color-text-alt);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-top: 1px;
	}

	.popup-actions {
		display: flex;
		gap: 6px;
		margin-top: 8px;
		pointer-events: auto;
	}

	.popup-btn {
		flex: 1;
		border: none;
		border-radius: var(--radius);
		padding: 6px 0;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.popup-btn.view {
		background: rgba(255, 255, 255, 0.1);
		color: var(--color-text);
	}

	.popup-btn.accept {
		background: var(--color-success);
		color: #fff;
	}

	.popup-btn.cancel {
		background: rgba(255, 255, 255, 0.08);
		color: var(--color-error-light, var(--color-error));
	}
</style>
