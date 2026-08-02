<!-- browse/install/uninstall apps -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import AppIcon from '../../components/AppIcon.svelte';
	import { dataState, updatePlayerApps } from '../../store/data.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { PhoneApp } from '../../../config';

	let tab = $state<'store' | 'installed'>('store');
	let search = $state('');
	let pending = $state<Set<string>>(new Set());
	let unlocked = $state<Record<string, boolean>>({});

	$effect(() => {
		Nui.getStoreCatalog().then((result) => {
			unlocked = result;
		});
	});

	const installedNames = $derived(new Set(dataState.player?.Apps.installed ?? []));

	function matchesSearch(app: PhoneApp): boolean {
		return !search || app.storeLabel.toLowerCase().includes(search.toLowerCase());
	}

	const storeApps = $derived(
		Object.values(dataState.appRegistry)
			.filter(
				(a) =>
					a.store &&
					!a.hidden &&
					!installedNames.has(a.name) &&
					(!a.restricted || unlocked[a.name]) &&
					matchesSearch(a),
			)
			.sort((a, b) => a.storeLabel.localeCompare(b.storeLabel)),
	);

	const installedApps = $derived(
		Object.values(dataState.appRegistry)
			.filter((a) => installedNames.has(a.name) && matchesSearch(a))
			.sort((a, b) => a.storeLabel.localeCompare(b.storeLabel)),
	);

	function iconName(app: PhoneApp): string {
		return typeof app.icon === 'string' ? app.icon : app.icon[1];
	}

	function setPending(name: string, on: boolean) {
		const next = new Set(pending);
		if (on) next.add(name);
		else next.delete(name);
		pending = next;
	}

	// matches the ring's fill-progress animation length, real round-trip is usually faster than this
	const MIN_PROGRESS_MS = 4500;

	async function waitOutMinimum(startedAt: number) {
		const remaining = MIN_PROGRESS_MS - (Date.now() - startedAt);
		if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
	}

	async function installApp(app: PhoneApp) {
		if (pending.has(app.name)) return;
		setPending(app.name, true);
		const startedAt = Date.now();
		const ok = await Nui.installCheck(app.name);
		if (!ok) {
			setPending(app.name, false);
			pushAlert(`Failed To Install ${app.storeLabel}`, 'error');
			return;
		}
		const done = await Nui.install(app.name);
		await waitOutMinimum(startedAt);
		setPending(app.name, false);
		if (done) {
			const installed = dataState.player?.Apps.installed ?? [];
			const home = dataState.player?.Apps.home ?? [];
			updatePlayerApps({
				installed: installed.includes(app.name) ? installed : [...installed, app.name],
				home: home.includes(app.name) ? home : [...home, app.name],
			});
			pushAlert(`${app.storeLabel} Installed`);
		} else {
			pushAlert(`Failed To Install ${app.storeLabel}`, 'error');
		}
	}

	async function uninstallApp(app: PhoneApp) {
		if (pending.has(app.name) || !app.canUninstall) return;
		setPending(app.name, true);
		const startedAt = Date.now();
		const ok = await Nui.uninstallCheck(app.name);
		if (!ok) {
			setPending(app.name, false);
			pushAlert(`Failed To Uninstall ${app.storeLabel}`, 'error');
			return;
		}
		await Nui.uninstall(app.name);
		await waitOutMinimum(startedAt);
		setPending(app.name, false);
		updatePlayerApps({
			installed: (dataState.player?.Apps.installed ?? []).filter((a) => a !== app.name),
			home: (dataState.player?.Apps.home ?? []).filter((a) => a !== app.name),
			dock: (dataState.player?.Apps.dock ?? []).filter((a) => a !== app.name),
		});
		pushAlert(`${app.storeLabel} Uninstalled`);
	}
</script>

<AppContainer appId="store" useAppColor={true}>
	<div class="search-wrap">
		<input class="search-input" placeholder="Search" bind:value={search} />
	</div>

	<div class="tab-strip">
		<button class="tab-btn" class:active={tab === 'store'} onclick={() => (tab = 'store')}>Store</button>
		<button class="tab-btn" class:active={tab === 'installed'} onclick={() => (tab = 'installed')}>Installed</button>
	</div>

	<div class="content">
		{#if tab === 'store'}
			{#if storeApps.length === 0}
				<div class="empty">No More Apps To Install</div>
			{:else}
				{#each storeApps as app (app.name)}
					<div class="app-row">
						<AppIcon name={iconName(app)} color={app.color} size={44} glow={0.5} />
						<div class="app-text">
							<span class="app-name">{app.storeLabel}</span>
							<span class="app-sub">{pending.has(app.name) ? 'Installing…' : 'App'}</span>
						</div>
						<button
							class="get-btn"
							class:pending={pending.has(app.name)}
							disabled={pending.has(app.name)}
							onclick={() => installApp(app)}
							aria-label={`Install ${app.storeLabel}`}
						>
							{#if pending.has(app.name)}
								<svg class="progress-svg" viewBox="0 0 36 36" aria-hidden="true">
									<circle class="track" cx="18" cy="18" r="15" />
									<circle class="fill" cx="18" cy="18" r="15" />
								</svg>
							{:else}
								GET
							{/if}
						</button>
					</div>
				{/each}
			{/if}
		{:else if installedApps.length === 0}
			<div class="empty">No Installed Apps</div>
		{:else}
			{#each installedApps as app (app.name)}
				<div class="app-row">
					<AppIcon name={iconName(app)} color={app.color} size={44} glow={0.5} />
					<div class="app-text">
						<span class="app-name">{app.storeLabel}</span>
						<span class="app-sub">{pending.has(app.name) ? 'Removing…' : app.canUninstall ? 'Installed' : 'Built-in'}</span>
					</div>
					{#if app.canUninstall}
						<button
							class="get-btn remove"
							class:pending={pending.has(app.name)}
							disabled={pending.has(app.name)}
							onclick={() => uninstallApp(app)}
							aria-label={`Remove ${app.storeLabel}`}
						>
							{#if pending.has(app.name)}
								<svg class="progress-svg" viewBox="0 0 36 36" aria-hidden="true">
									<circle class="track" cx="18" cy="18" r="15" />
									<circle class="fill" cx="18" cy="18" r="15" />
								</svg>
							{:else}
								Remove
							{/if}
						</button>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</AppContainer>

<style>
	.search-wrap {
		padding: 10px 14px 6px;
	}

	.search-input {
		width: 100%;
		background: rgba(255, 255, 255, 0.07);
		border: none;
		border-radius: 10px;
		padding: 8px 12px;
		color: var(--color-text);
		font-size: 14px;
		outline: none;
	}

	.search-input::placeholder {
		color: var(--color-text-muted);
	}

	.tab-strip {
		display: flex;
		gap: 6px;
		padding: 0 14px 8px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.tab-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 13px;
		font-weight: 600;
		padding: 6px 4px;
		cursor: pointer;
		border-bottom: 2px solid transparent;
	}

	.tab-btn.active {
		color: var(--color-text);
		border-bottom-color: var(--color-primary);
	}

	.content {
		height: calc(100% - 92px);
		overflow-y: auto;
		overflow-x: hidden;
	}

	.empty {
		text-align: center;
		margin-top: 25%;
		font-size: 15px;
		color: var(--color-text-muted);
	}

	.app-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.app-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.app-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.app-sub {
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	/* solid backdrop so the accent-colored label stays readable at any accent color */
	.get-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 60px;
		background: var(--color-bg-panel-alt);
		border: none;
		border-radius: 14px;
		padding: 6px 16px;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.02em;
		color: var(--color-primary);
		cursor: pointer;
	}

	.get-btn.remove {
		color: var(--color-error-light);
	}

	/* button turns into a 36px ring that fills clockwise while installing */
	.get-btn.pending {
		min-width: 0;
		width: 36px;
		height: 36px;
		padding: 0;
		border-radius: 50%;
		background: none;
	}

	.progress-svg {
		width: 36px;
		height: 36px;
		transform: rotate(-90deg);
	}

	.progress-svg .track {
		fill: none;
		stroke: rgba(255, 255, 255, 0.15);
		stroke-width: 3;
	}

	.progress-svg .fill {
		fill: none;
		stroke: currentColor;
		stroke-width: 3;
		stroke-linecap: round;
		stroke-dasharray: 94.2;
		stroke-dashoffset: 94.2;
		animation: fill-progress 4.5s ease-out forwards;
	}

	@keyframes fill-progress {
		to {
			stroke-dashoffset: 9;
		}
	}

	.get-btn:disabled {
		opacity: 1;
		cursor: default;
	}
</style>
