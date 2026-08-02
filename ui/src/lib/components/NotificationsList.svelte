<!-- in-app notification-center screen, reachable from Header's bell icon -->
<script lang="ts">
	import Icon from './Icon.svelte';
	import { notificationsState, dismissNotification, dismissAllNotifications } from '../store/notifications.svelte';
	import { dataState } from '../store/data.svelte';
	import { navigateToApp } from '../store/nav.svelte';
	import type { PhoneNotification } from '../types';

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
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return `${Math.floor(diff / 86400)}d ago`;
	}

	function onOpen(n: PhoneNotification) {
		const appName = typeof n.app === 'object' ? undefined : n.app;
		if (!appName) return;
		const view = n.action?.view as string | undefined;
		navigateToApp(appName, view ?? '');
	}
</script>

<div class="notif-list">
	<div class="rows">
		{#if notificationsState.list.length === 0}
			<div class="empty">No Notifications</div>
		{/if}
		{#each notificationsState.list as n (n.id)}
			<div class="row">
				<button class="icon-col" style:color={appColor(n.app)} onclick={() => onOpen(n)} aria-label={n.title}>
					<Icon name={appIcon(n.app)} size="22px" />
				</button>
				<button class="text-col" onclick={() => onOpen(n)}>
					<div class="row-title">{n.title}</div>
					<div class="row-time">{timeAgo(n.time)}</div>
				</button>
				{#if n.duration !== -1}
					<button class="dismiss-col" onclick={() => dismissNotification(n.id!)} aria-label="Dismiss">
						<Icon name="bell-slash" size="18px" />
					</button>
				{/if}
			</div>
		{/each}
	</div>
	<button class="footer" onclick={dismissAllNotifications}>Dismiss All</button>
</div>

<style>
	.notif-list {
		height: 100%;
		background: var(--color-secondary);
		display: flex;
		flex-direction: column;
	}

	.rows {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.empty {
		text-align: center;
		padding: 40px 0;
		color: var(--color-text-muted);
	}

	.row {
		display: grid;
		grid-template-columns: 55px 1fr 55px;
		align-items: center;
		border-bottom: 1px solid #000;
		font-size: 18px;
	}

	.icon-col,
	.text-col,
	.dismiss-col {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		text-align: center;
		padding: 15px 0;
	}

	.icon-col:hover,
	.text-col:hover {
		background: var(--color-secondary-light);
	}

	.text-col {
		text-align: left;
		color: var(--color-text);
	}

	.row-time {
		font-size: 14px;
		color: var(--color-text);
		opacity: 0.7;
	}

	.dismiss-col {
		color: var(--color-error);
	}

	.dismiss-col:hover {
		filter: brightness(0.75);
	}

	.footer {
		height: 40px;
		flex-shrink: 0;
		background: none;
		border: none;
		border-top: 1px solid #000;
		color: var(--color-text);
		text-align: center;
		font-size: 18px;
		cursor: pointer;
	}

	.footer:hover {
		filter: brightness(0.75);
	}
</style>
