<!-- home screen: paginated app grid, drag-to-reorder, 4-slot dock, right-click context menu -->
<script lang="ts">
	import { fly } from 'svelte/transition';
	import Icon from './Icon.svelte';
	import AppIcon from './AppIcon.svelte';
	import { CORE_APPS, type PhoneApp } from '../../config';
	import { dataState, updatePlayerApps } from '../store/data.svelte';
	import { navigateToApp } from '../store/nav.svelte';
	import { pushAlert } from '../store/alerts.svelte';
	import { Nui } from '../nui';

	const homeApps = $derived([...new Set(dataState.player?.Apps.home ?? [])]);
	const dockApps = $derived([...new Set(dataState.player?.Apps.dock ?? [])].slice(0, 4));
	// 4 columns wide x 5 rows tall (20/page) - the canvas is a fixed 500x1000 uniformly rescaled by CSS
	// transform (see Shell.svelte), so the same logical grid size fits regardless of the zoom setting
	const perPage = 20;
	const pageCount = $derived(Math.max(1, Math.ceil(homeApps.length / perPage)));

	let page = $state(1);
	$effect(() => {
		if (page > pageCount) page = pageCount;
	});

	const pageApps = $derived(homeApps.slice((page - 1) * perPage, page * perPage));

	function appOf(id: string): PhoneApp | undefined {
		return dataState.appRegistry[id] ?? CORE_APPS.find((a) => a.name === id);
	}

	function iconName(app: PhoneApp): string {
		return typeof app.icon === 'string' ? app.icon : app.icon[1];
	}

	function unreadFor(id: string): number {
		return dataState.unread[id] ?? 0;
	}

	function onOpen(appId: string) {
		if (editing) return;
		navigateToApp(appId);
		closeMenu();
	}

	// hold-to-organize: 1s hold enters edit mode (icons wiggle, dragging enabled, tapping no longer opens
	// the app), a DONE button exits it
	let editing = $state(false);
	let holdTimer: ReturnType<typeof setTimeout> | null = null;

	function holdStart() {
		holdTimer = setTimeout(() => {
			editing = true;
			holdTimer = null;
		}, 650);
	}

	function holdEnd() {
		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = null;
		}
	}

	function stopEditing() {
		editing = false;
	}

	// context menu
	let menuApp = $state<string | null>(null);
	let menuIsDock = $state(false);
	let menuPos = $state({ x: 0, y: 0 });

	function openMenu(e: MouseEvent, appId: string, isDock: boolean) {
		e.preventDefault();
		menuApp = appId;
		menuIsDock = isDock;
		menuPos = { x: e.clientX, y: e.clientY };
	}

	function closeMenu() {
		menuApp = null;
	}

	async function menuAddHome() {
		if (!menuApp) return;
		await Nui.setHome(menuApp, 'add');
		updatePlayerApps({ home: [...homeApps, menuApp] });
		pushAlert(`${appOf(menuApp)?.label ?? 'App'} Added To Home Screen`);
		closeMenu();
	}

	async function menuRemoveHome() {
		if (!menuApp) return;
		await Nui.setHome(menuApp, 'remove');
		updatePlayerApps({ home: homeApps.filter((a) => a !== menuApp) });
		pushAlert(`${appOf(menuApp)?.label ?? 'App'} Removed From Home Screen`);
		closeMenu();
	}

	async function menuAddDock() {
		if (!menuApp) return;
		if (dockApps.length >= 4) {
			pushAlert('Can Only Have 4 Apps In Dock', 'error');
			closeMenu();
			return;
		}
		await Nui.setDock(menuApp, 'add');
		updatePlayerApps({ dock: [...dockApps, menuApp] });
		pushAlert(`${appOf(menuApp)?.label ?? 'App'} Added To Dock`);
		closeMenu();
	}

	async function menuRemoveDock() {
		if (!menuApp) return;
		await Nui.setDock(menuApp, 'remove');
		updatePlayerApps({ dock: dockApps.filter((a) => a !== menuApp) });
		pushAlert(`${appOf(menuApp)?.label ?? 'App'} Removed From Dock`);
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
			dock: dockApps.filter((a) => a !== id),
		});
		pushAlert(`${appOf(id)?.label ?? 'App'} Uninstalled`);
	}

	// native drag-to-reorder within the current page
	let dragId: string | null = null;

	function onDragStart(appId: string) {
		if (!editing) return;
		dragId = appId;
	}

	function onDropOn(targetId: string) {
		if (!dragId || dragId === targetId) return;
		const from = homeApps.indexOf(dragId);
		const to = homeApps.indexOf(targetId);
		if (from === -1 || to === -1) return;
		const next = [...homeApps];
		next.splice(from, 1);
		next.splice(to, 0, dragId);
		updatePlayerApps({ home: next });
		Nui.reorder('home', next);
		dragId = null;
	}
</script>

<svelte:window onclick={closeMenu} />

<div class="home">
	<div class="grid">
		{#each pageApps as appId (appId)}
			{@const app = appOf(appId)}
			{#if app}
				<div class="cell">
					<button
						class="app-button"
						class:edit={editing}
						draggable={editing}
						ondragstart={() => onDragStart(appId)}
						ondragover={(e) => e.preventDefault()}
						ondrop={() => onDropOn(appId)}
						onclick={() => onOpen(appId)}
						oncontextmenu={(e) => openMenu(e, appId, false)}
						onpointerdown={holdStart}
						onpointerup={holdEnd}
						onpointerleave={holdEnd}
						title={app.label}
					>
						<span class="icon-wrap">
							<AppIcon name={iconName(app)} color={app.color} size={66} glow={0.6} />
							{#if unreadFor(appId) > 0}
								<span class="badge">{unreadFor(appId)}</span>
							{/if}
						</span>
						<span class="label">{app.label}</span>
					</button>
				</div>
			{/if}
		{/each}
	</div>

	{#if editing}
		<button class="done-btn" onclick={stopEditing} transition:fly={{ y: -16, duration: 180 }}>Done</button>
	{/if}

	{#if pageCount > 1}
		<div class="page-dots">
			{#each Array(pageCount) as _, i (i)}
				<button class="dot" class:active={page === i + 1} onclick={() => (page = i + 1)} aria-label={`Page ${i + 1}`}></button>
			{/each}
		</div>
	{/if}

	<div class="dock">
		{#each dockApps as appId (appId)}
			{@const app = appOf(appId)}
			{#if app}
				<button
					class="app-button docked"
					class:edit={editing}
					onclick={() => onOpen(appId)}
					oncontextmenu={(e) => openMenu(e, appId, true)}
					onpointerdown={holdStart}
					onpointerup={holdEnd}
					onpointerleave={holdEnd}
					title={app.label}
				>
					<span class="icon-wrap">
						<AppIcon name={iconName(app)} color={app.color} size={54} glow={0.6} />
						{#if unreadFor(appId) > 0}
							<span class="badge">{unreadFor(appId)}</span>
						{/if}
					</span>
				</button>
			{/if}
		{/each}
	</div>

	<button class="show-all" onclick={() => navigateToApp('__all_apps__')} aria-label="Show All Apps">
		<Icon name="angle-up" size="20px" />
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
			<button onclick={() => onOpen(menuApp!)}>Open {app?.label ?? ''}</button>
			{#if menuIsDock}
				<button onclick={menuRemoveDock}>Remove From Dock</button>
			{:else if dockApps.includes(menuApp)}
				<button disabled>Already In Dock</button>
			{:else}
				<button onclick={menuAddDock}>Add To Dock</button>
			{/if}
			{#if homeApps.includes(menuApp)}
				<button onclick={menuRemoveHome}>Remove From Home</button>
			{:else}
				<button onclick={menuAddHome}>Add To Home</button>
			{/if}
			{#if app?.canUninstall}
				<button class="danger" onclick={menuUninstall}>Uninstall {app.label}</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.home {
		height: 100%;
		display: flex;
		flex-direction: column;
		position: relative;
		user-select: none;
	}

	.grid {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		overflow: hidden;
		padding: 12px 8px 0;
	}

	.cell {
		width: 25%;
		height: 118px;
	}

	.app-button {
		background: none;
		border: none;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		cursor: pointer;
		border-radius: 12px;
		transition: background 150ms ease;
	}

	.app-button:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.app-button.docked {
		width: 25%;
		gap: 0;
	}

	.app-button.edit {
		animation: wiggle 0.22s infinite;
	}

	@keyframes wiggle {
		0% {
			transform: rotate(-1.5deg);
		}
		50% {
			transform: rotate(1.5deg);
		}
		100% {
			transform: rotate(-1.5deg);
		}
	}

	.done-btn {
		position: absolute;
		top: 10px;
		left: 0;
		right: 0;
		margin: auto;
		width: fit-content;
		background: var(--color-text);
		color: var(--color-secondary-dark);
		border: none;
		border-radius: 14px;
		padding: 5px 16px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		z-index: 20;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
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
		font-size: 12px;
		font-weight: 700;
		min-width: 20px;
		height: 20px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 5px;
	}

	.label {
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.page-dots {
		display: flex;
		justify-content: center;
		gap: 6px;
		padding-bottom: 4px;
	}

	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.35);
		cursor: pointer;
		padding: 0;
	}

	.dot.active {
		background: var(--color-primary);
	}

	.dock {
		background: rgba(29, 30, 30, 0.72);
		height: 84px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-evenly;
		padding: 0 10px;
	}

	.show-all {
		position: absolute;
		bottom: 100px;
		left: 0;
		right: 0;
		margin: auto;
		width: fit-content;
		background: none;
		border: none;
		color: var(--color-text-alt);
		cursor: pointer;
		padding: 4px 10px;
	}

	.show-all:hover {
		color: var(--color-primary);
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
