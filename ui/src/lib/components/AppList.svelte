<!-- full installed-apps list, opened from Home's chevron-up button: search box + scrollable grid, right-click for Add To Home/Open/Uninstall -->
<script lang="ts">
	import AppIcon from './AppIcon.svelte';
	import Icon from './Icon.svelte';
	import { CORE_APPS, type PhoneApp } from '../../config';
	import { dataState, updatePlayerApps } from '../store/data.svelte';
	import { navigateToApp, navigateHome } from '../store/nav.svelte';
	import { pushAlert } from '../store/alerts.svelte';
	import { Nui } from '../nui';

	let search = $state('');

	function appOf(id: string): PhoneApp | undefined {
		return dataState.appRegistry[id] ?? CORE_APPS.find((a) => a.name === id);
	}

	function iconName(app: PhoneApp): string {
		return typeof app.icon === 'string' ? app.icon : app.icon[1];
	}

	function unreadFor(id: string): number {
		return dataState.unread[id] ?? 0;
	}

	const installedApps = $derived(
		[...new Set(dataState.player?.Apps.installed ?? [])]
			.map((id) => ({ id, app: appOf(id) }))
			.filter((entry): entry is { id: string; app: PhoneApp } => Boolean(entry.app))
			.filter(({ app }) => !search || app.label.toUpperCase().includes(search.toUpperCase()))
			.sort((a, b) => a.app.label.localeCompare(b.app.label)),
	);

	function onOpen(id: string) {
		navigateToApp(id);
		closeMenu();
	}

	// context menu
	let menuApp = $state<string | null>(null);
	let menuPos = $state({ x: 0, y: 0 });

	function openMenu(e: MouseEvent, id: string) {
		e.preventDefault();
		menuApp = id;
		menuPos = { x: e.clientX, y: e.clientY };
	}

	function closeMenu() {
		menuApp = null;
	}

	const homeApps = $derived(dataState.player?.Apps.home ?? []);

	async function menuAddToHome() {
		if (!menuApp) return;
		await Nui.setHome(menuApp, 'add');
		updatePlayerApps({ home: [...homeApps, menuApp] });
		pushAlert(`${appOf(menuApp)?.label ?? 'App'} Added To Home Screen`);
		closeMenu();
	}

	async function menuUninstall() {
		if (!menuApp) return;
		const id = menuApp;
		closeMenu();
		const ok = await Nui.uninstallCheck(id);
		if (!ok) return;
		await Nui.uninstall(id);
		updatePlayerApps({
			installed: (dataState.player?.Apps.installed ?? []).filter((a) => a !== id),
			home: homeApps.filter((a) => a !== id),
			dock: (dataState.player?.Apps.dock ?? []).filter((a) => a !== id),
		});
		pushAlert(`${appOf(id)?.label ?? 'App'} Uninstalled`);
	}
</script>

<svelte:window onclick={closeMenu} />

<div class="app-list">
	<div class="search-wrap">
		<input class="search-input" placeholder="Search For App" bind:value={search} />
	</div>
	<div class="grid">
		{#each installedApps as { id, app } (id)}
			<button class="app-button" onclick={() => onOpen(id)} oncontextmenu={(e) => openMenu(e, id)} title={app.label}>
				<span class="icon-wrap">
					<AppIcon name={iconName(app)} color={app.color} size={72} glow={0.6} />
					{#if unreadFor(id) > 0}
						<span class="badge">{unreadFor(id)}</span>
					{/if}
				</span>
				<span class="label">{app.label}</span>
			</button>
		{/each}
	</div>

	<button class="close-btn" onclick={navigateHome} aria-label="Close">
		<Icon name="chevron-down" size="22px" />
	</button>

	{#if menuApp}
		{@const app = appOf(menuApp)}
		<div
			class="context-menu"
			style:left={`${menuPos.x}px`}
			style:top={`${menuPos.y}px`}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && closeMenu()}
			role="menu"
			tabindex="-1"
		>
			<div class="menu-header">{app?.label ?? 'App'}</div>
			<button disabled={homeApps.includes(menuApp)} onclick={menuAddToHome}>Add To Home</button>
			<button onclick={() => onOpen(menuApp!)}>Open {app?.label ?? ''}</button>
			{#if app?.canUninstall}
				<button class="danger" onclick={menuUninstall}>Uninstall {app.label}</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.app-list {
		height: 100%;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	.search-wrap {
		padding: 16px;
		flex-shrink: 0;
	}

	.search-input {
		width: 100%;
		background: none;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.3);
		padding: 6px 2px;
		color: var(--color-text);
		font-size: 14px;
		outline: none;
	}

	.search-input:focus {
		border-bottom-color: var(--color-primary);
	}

	.grid {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 0 8px;
	}

	.app-button {
		background: none;
		border: none;
		width: 25%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 15px 0;
		cursor: pointer;
		border-radius: 12px;
		transition: background 150ms ease;
	}

	.app-button:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.icon-wrap {
		position: relative;
		display: inline-flex;
	}

	.badge {
		position: absolute;
		top: -6px;
		right: -6px;
		background: #cc0000;
		color: #fff;
		font-size: 11px;
		font-weight: 700;
		min-width: 18px;
		height: 18px;
		border-radius: 9px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 4px;
	}

	.label {
		font-size: 13px;
		font-weight: 600;
		color: #fff;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.close-btn {
		position: absolute;
		bottom: 10px;
		left: 0;
		right: 0;
		margin: auto;
		width: fit-content;
		background: none;
		border: none;
		cursor: pointer;
		opacity: 0.8;
	}

	.close-btn:hover {
		opacity: 1;
	}

	.context-menu {
		position: fixed;
		z-index: 999;
		background: var(--color-secondary);
		border-radius: var(--radius);
		box-shadow: var(--shadow-panel);
		display: flex;
		flex-direction: column;
		min-width: 180px;
		overflow: hidden;
	}

	.menu-header {
		padding: 8px 12px;
		font-size: 13px;
		color: var(--color-text-muted);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.context-menu button {
		background: none;
		border: none;
		text-align: left;
		padding: 8px 12px;
		font-size: 14px;
		color: var(--color-text);
		cursor: pointer;
	}

	.context-menu button:hover:not(:disabled) {
		background: var(--color-secondary-light);
	}

	.context-menu button:disabled {
		color: var(--color-text-muted);
		cursor: default;
	}

	.context-menu button.danger {
		color: var(--color-error-light);
	}
</style>
