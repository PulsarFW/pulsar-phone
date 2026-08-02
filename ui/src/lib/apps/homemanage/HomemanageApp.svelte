<!-- Properties: DigiKeys/upgrades/furniture. Home:HighlightFurniture is a known dead callback upstream, ported as-is -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Loader from '../../primitives/Loader.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import Confirm from '../../primitives/Confirm.svelte';
	import Dropdown from '../../primitives/Dropdown.svelte';
	import { dataState } from '../../store/data.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { CurrentFurnitureResult, HomeProperty, PropertyUpgradesForType } from '../../types';

	const view = $derived(navState.route.startsWith('view/') ? 'view' : 'list');
	const propId = $derived(view === 'view' ? navState.route.slice('view/'.length) : null);

	const player = $derived(dataState.player);
	let loading = $state(false);
	let properties = $state<HomeProperty[]>([]);
	let upgradesConfig = $state<Record<string, PropertyUpgradesForType>>({});
	let loaded = $state(false);

	async function fetchProperties() {
		loading = true;
		const res = await Nui.homeGetMyProperties();
		if (res) {
			properties = res.properties;
			upgradesConfig = res.upgrades;
		} else {
			properties = [];
		}
		loading = false;
	}

	$effect(() => {
		if (!loaded) {
			loaded = true;
			fetchProperties();
		}
	});

	const selectedProperty = $derived(propId ? properties.find((p) => String(p.id) === propId) : undefined);
	const myKey = $derived(selectedProperty && player?.ID ? selectedProperty.keys[player.ID] : undefined);

	function keyLabel(entry: { Owner: boolean }): string {
		return entry.Owner ? 'Owner' : 'Key Holder';
	}

	let removingMyKey = $state(false);
	async function confirmRemoveMyKey() {
		removingMyKey = false;
		if (!selectedProperty) return;
		const res = await Nui.homeRemoveMyKey(selectedProperty.id);
		if (!res.error) {
			pushAlert('Removed DigiKey');
			navigateToApp('homemanage');
			fetchProperties();
		} else {
			pushAlert('Unable To Remove DigiKey', 'error');
		}
	}

	async function lockProperty() {
		if (!selectedProperty) return;
		loading = true;
		const ok = await Nui.homeLockProperty(selectedProperty.id);
		if (ok) {
			pushAlert('Property Locked');
			properties = properties.map((p) => (p.id === selectedProperty.id ? { ...p, locked: true } : p));
		} else {
			pushAlert('Unable To Lock Property', 'error');
		}
		loading = false;
	}

	// MyHouse tabs
	let activeTab = $state<0 | 1 | 2>(0);
	let loadedPropFor = $state<string | null>(null);
	$effect(() => {
		if (view === 'view' && propId && loadedPropFor !== propId) {
			loadedPropFor = propId;
			activeTab = 0;
		}
	});

	// ---- Keys tab ----
	const ERROR_MESSAGES: Record<number, string> = {
		1: 'Error Occurred',
		2: 'Invalid Property',
		3: 'Not Allowed',
		4: 'Invalid Target Player',
		5: 'Invalid Target Character',
		6: 'Person Already Has DigiKey For Property',
		7: 'Error Occurred Issuing DigiKey',
	};
	const REVOKE_ERROR_MESSAGES: Record<number, string> = { ...ERROR_MESSAGES, 6: "Person Doesn't Have A DigiKey For Property" };

	const PROPERTY_PERMISSIONS = [
		{ value: 'upgrade', name: 'Manage Upgrades' },
		{ value: 'furniture', name: 'Manage Furniture' },
		{ value: 'stash', name: 'Access Stash' },
	];

	let keyCreating = $state(false);
	let keyTarget = $state('');
	let keyUpdating = $state(false);
	let keyPermissions = $state<Record<string, boolean>>({});
	let keySubmitting = $state(false);
	let revokingKey = $state<string | null>(null);

	function openCreateKey() {
		keyTarget = '';
		keyUpdating = false;
		keyPermissions = {};
		keyCreating = true;
	}

	function openUpdateKey(sid: number, permissions: Record<string, boolean> | undefined) {
		keyTarget = String(sid);
		keyUpdating = true;
		keyPermissions = { ...(permissions ?? {}) };
		keyCreating = true;
	}

	function toggleKeyPermission(value: string) {
		const perms = { ...keyPermissions };
		if (perms[value]) delete perms[value];
		else perms[value] = true;
		keyPermissions = perms;
	}

	async function submitKey() {
		if (!selectedProperty || !keyTarget.trim()) return;
		keySubmitting = true;
		const res = await Nui.homeCreateDigiKey({ updating: keyUpdating, id: selectedProperty.id, target: Number(keyTarget), permissions: keyPermissions });
		keySubmitting = false;
		if (!res.error) {
			pushAlert(keyUpdating ? 'DigiKey Has Been Updated' : 'New DigiKey Has Been Issued');
			keyCreating = false;
			fetchProperties();
		} else {
			pushAlert(ERROR_MESSAGES[res.code] ?? 'Error Occurred', 'error');
		}
	}

	async function confirmRevokeKey() {
		if (!selectedProperty || !revokingKey) return;
		const target = revokingKey;
		revokingKey = null;
		const res = await Nui.homeRevokeDigiKey(selectedProperty.id, target);
		if (!res.error) {
			pushAlert('DigiKey Has Been Revoked');
			fetchProperties();
		} else {
			pushAlert(REVOKE_ERROR_MESSAGES[res.code] ?? 'Error Occurred', 'error');
		}
	}

	// ---- Upgrades tab ----
	const availableUpgrades = $derived(selectedProperty ? upgradesConfig[selectedProperty.type] : undefined);
	const otherUpgradeTypes = $derived(availableUpgrades ? Object.keys(availableUpgrades).filter((k) => k !== 'interior') : []);

	function upgradeLevels(type: string) {
		const def = availableUpgrades?.[type];
		return def && 'levels' in def ? def.levels : [];
	}

	let buyingUpgrade = $state<{ type: string; nextIndex: number } | null>(null);
	function currentUpgradeIndex(type: string): number {
		return Number(selectedProperty?.upgrades?.[type] ?? 1) - 1;
	}

	async function confirmBuyUpgrade() {
		if (!selectedProperty || !buyingUpgrade) return;
		const type = buyingUpgrade.type;
		buyingUpgrade = null;
		loading = true;
		const ok = await Nui.homePurchaseUpgrade(type, selectedProperty.id);
		pushAlert(ok ? 'Upgrade Purchased' : 'Unable To Purchase Upgrade', ok ? 'info' : 'error');
		if (ok) fetchProperties();
		loading = false;
	}

	let interiorModalOpen = $state(false);
	let purchasingInterior = $state<{ id: string | number; name: string } | null>(null);

	function currentInterior() {
		const def = availableUpgrades?.interior;
		return def?.levels.find((l) => l.id === selectedProperty?.upgrades?.interior);
	}

	function interiorPrice(currentPrice: number, price: number): number {
		const cost = 50000;
		return currentPrice > price ? cost : cost + (price - currentPrice);
	}

	function previewInterior(int: string | number) {
		Nui.homePreviewInterior(int);
	}

	async function confirmBuyInterior() {
		if (!selectedProperty || !purchasingInterior) return;
		const int = purchasingInterior.id;
		purchasingInterior = null;
		loading = true;
		const ok = await Nui.homePurchaseInterior(int, selectedProperty.id);
		pushAlert(ok ? 'Interior Upgraded' : 'Unable To Purchase Upgrade', ok ? 'info' : 'error');
		if (ok) fetchProperties();
		loading = false;
	}

	// ---- Furniture tab ----
	let furnitureLoaded = $state(false);
	let furnitureErr = $state<string | null>('Must Be Inside Property');
	let furnitureList = $state<CurrentFurnitureResult['furniture']>([]);
	let furnitureCatalog = $state<CurrentFurnitureResult['catalog']>({});
	let furnitureCats = $state<CurrentFurnitureResult['categories']>({});
	let expandedFurniture = $state<number | null>(null);

	async function loadFurniture() {
		if (!selectedProperty) return;
		const res = await Nui.homeGetCurrentFurniture(selectedProperty);
		if (res && res.success) {
			furnitureList = res.furniture ?? [];
			furnitureCatalog = res.catalog ?? {};
			furnitureCats = res.categories ?? {};
			furnitureErr = null;
		} else {
			furnitureErr = res?.err ?? 'Error';
		}
	}

	$effect(() => {
		if (view === 'view' && activeTab === 2 && !furnitureLoaded) {
			furnitureLoaded = true;
			loadFurniture();
		}
	});

	function toggleEditMode() {
		Nui.homeEditMode();
	}

	async function editFurniture(id: number | string) {
		await Nui.homeEditFurniture(id);
	}

	async function findFurniture(id: number | string) {
		const ok = await Nui.homeHighlightFurniture(id);
		pushAlert(ok ? 'Furniture Is Highlighted' : 'Unable To Find Furniture', ok ? 'info' : 'error');
	}

	async function cloneFurniture(cat: string, model: string) {
		const ok = await Nui.homePlaceFurniture(cat, model);
		if (!ok) pushAlert('Unable To Start Placement', 'error');
	}

	async function deleteFurniture(id: number | string) {
		const res = await Nui.homeDeleteFurniture(id);
		if (res) {
			pushAlert('Furniture Deleted');
			furnitureList = res;
		} else {
			pushAlert('Unable To Delete Furniture', 'error');
		}
	}

	let choosingFurniture = $state(false);
	let furnitureSearch = $state('');
	let selectedCat = $state('misc');

	function chooseFurniture(model: string) {
		choosingFurniture = false;
		const entry = furnitureCatalog?.[model];
		if (entry) cloneFurniture(entry.cat, model);
	}

	const catalogEntries = $derived.by(() => {
		const catalog = furnitureCatalog ?? {};
		const keys = Object.keys(catalog);
		if (selectedCat === 'search') {
			return keys
				.filter((m) => catalog[m].name.toLowerCase().includes(furnitureSearch.toLowerCase()) || catalog[m].model.toLowerCase().includes(furnitureSearch.toLowerCase()))
				.sort((a, b) => catalog[a].id - catalog[b].id);
		}
		return keys.filter((m) => catalog[m].cat === selectedCat).sort((a, b) => catalog[a].id - catalog[b].id);
	});
</script>

{#if view === 'list'}
	<AppContainer appId="homemanage" title="Properties" useAppColor={true}>
		{#if loading}
			<Loader static text="Loading" />
		{:else if properties.length === 0}
			<div class="empty">You Don't Have Access To Any Properties</div>
		{:else}
			<div class="prop-list">
				{#each properties as property (property.id)}
					{@const key = player?.ID ? property.keys[player.ID] : undefined}
					<button class="prop-row" onclick={() => navigateToApp('homemanage', `view/${property.id}`)}>
						<span class="row-badge"><Icon name="house" size="17px" /></span>
						<span class="prop-main">
							<span class="prop-name">{property.label}</span>
							<span class="prop-sub">{key ? keyLabel(key) : ''}</span>
						</span>
						<Icon name="chevron-right" size="14px" />
					</button>
				{/each}
			</div>
		{/if}
	</AppContainer>
{:else if view === 'view'}
	<AppContainer appId="homemanage" title={selectedProperty?.label ?? 'Property'} useAppColor={true}>
		{#snippet actions()}
			{#if selectedProperty}
				<button class="header-action" onclick={() => navigateToApp('homemanage')} aria-label="Go Back"><Icon name="house" size="20px" /></button>
				{#if myKey && !myKey.Owner}
					<button class="header-action" onclick={() => (removingMyKey = true)} disabled={loading} aria-label="Remove DigiKey"><Icon name="trash-can" size="20px" /></button>
				{/if}
				{#if !selectedProperty.locked}
					<button class="header-action" onclick={lockProperty} disabled={loading} aria-label="Lock Property"><Icon name="lock" size="20px" /></button>
				{/if}
			{/if}
			<button class="header-action" onclick={fetchProperties} disabled={loading} aria-label="Refresh"><Icon name="arrows-rotate" size="20px" /></button>
		{/snippet}
		{#if loading}
			<Loader static text="Loading" />
		{:else if !selectedProperty || !myKey}
			<div class="empty">Property Not Found</div>
		{:else}
			<div class="tab-body">
				{#if activeTab === 0}
					<!-- Keys -->
					<div class="key-list">
						{#each Object.keys(selectedProperty.keys).sort((a, b) => Number(selectedProperty.keys[b].Owner) - Number(selectedProperty.keys[a].Owner)) as k (k)}
							{@const data = selectedProperty.keys[k]}
							{@const canRevoke = myKey.Owner && !data.Owner}
							<div class="key-row">
								<span class="row-badge"><Icon name={data.Owner ? 'key' : 'user'} size="15px" /></span>
								<span class="key-main">
									<span class="key-name">{data.First} {data.Last}</span>
									<span class="key-sub">{keyLabel(data)}</span>
								</span>
								{#if canRevoke}
									<button class="icon-btn" onclick={() => openUpdateKey(data.SID, data.Permissions)} aria-label="Edit Key"><Icon name="pen-to-square" size="13px" /></button>
									<button class="icon-btn" onclick={() => (revokingKey = data.Char)} aria-label="Revoke Key"><Icon name="trash" size="13px" /></button>
								{/if}
							</div>
						{/each}
					</div>
					{#if myKey.Owner}
						<button class="fab" onclick={openCreateKey} aria-label="Create DigiKey"><Icon name="plus" size="18px" /></button>
					{/if}
				{:else if activeTab === 1}
					<!-- Upgrades -->
					{#if !myKey.Permissions?.upgrade && !myKey.Owner}
						<div class="empty small">Invalid Permissions</div>
					{:else if !availableUpgrades}
						<div class="empty small">No Property Upgrades Available</div>
					{:else}
						{@const interior = currentInterior()}
						<div class="upgrade-list">
							<div class="upgrade-row">
								<span class="row-badge"><Icon name="door-open" size="15px" /></span>
								<span class="upgrade-main">
									<span class="upgrade-name">Interior</span>
									<span class="upgrade-sub">{interior?.name ?? 'Unknown'} (${(interior?.price ?? 0).toLocaleString('en-US')})</span>
								</span>
								<button class="icon-btn" onclick={() => (interiorModalOpen = true)} aria-label="Change Interior"><Icon name="bag-shopping" size="14px" /></button>
							</div>
							{#each otherUpgradeTypes as type (type)}
								{@const levels = upgradeLevels(type)}
								{@const idx = currentUpgradeIndex(type)}
								{@const current = levels[idx]}
								{@const next = levels[idx + 1]}
								{#if current}
									<div class="upgrade-row">
										<span class="row-badge"><Icon name="screwdriver-wrench" size="15px" /></span>
										<span class="upgrade-main">
											<span class="upgrade-name">{current.name}</span>
											<span class="upgrade-sub">{current.info}{next ? '' : ' - Max Upgrade Reached'}</span>
										</span>
										<button class="icon-btn" disabled={!next} onclick={() => (buyingUpgrade = { type, nextIndex: idx + 1 })} aria-label="Upgrade"><Icon name="turn-up" size="14px" /></button>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				{:else if activeTab === 2}
					<!-- Furniture -->
					{#if !myKey.Permissions?.furniture && !myKey.Owner}
						<div class="empty small">Invalid Permissions</div>
					{:else if furnitureErr}
						<div class="empty small">{furnitureErr}</div>
					{:else}
						<button class="toggle-edit" onclick={toggleEditMode}>Toggle Edit Mode</button>
						<div class="furniture-list">
							{#each [...(furnitureList ?? [])].sort((a, b) => a.dist - b.dist) as f, i (f.id)}
								<div class="furniture-card">
									<button class="furniture-summary" onclick={() => (expandedFurniture = expandedFurniture === i ? null : i)}>
										<span class="furniture-main">
											<span class="furniture-name">{f.name}</span>
											<span class="furniture-sub">ID: {f.id} | Dist: {Math.round(f.dist)}</span>
										</span>
										<Icon name={expandedFurniture === i ? 'chevron-up' : 'chevron-down'} size="13px" />
									</button>
									{#if expandedFurniture === i}
										<div class="furniture-actions">
											<button class="furn-btn" onclick={() => editFurniture(f.id)} aria-label="Move"><Icon name="arrows-up-down-left-right" size="15px" /></button>
											<button class="furn-btn" onclick={() => findFurniture(f.id)} aria-label="Find"><Icon name="magnifying-glass" size="15px" /></button>
											<button class="furn-btn" onclick={() => deleteFurniture(f.id)} aria-label="Delete"><Icon name="trash" size="15px" /></button>
											<button class="furn-btn" onclick={() => cloneFurniture(f.cat, f.model)} aria-label="Clone"><Icon name="clone" size="15px" /></button>
										</div>
									{/if}
								</div>
							{/each}
						</div>
						<button class="fab" onclick={() => (choosingFurniture = true)} aria-label="Place New Item"><Icon name="plus" size="18px" /></button>
					{/if}
				{/if}
			</div>
			<div class="tab-bar">
				<button class="tab-btn" class:active={activeTab === 0} onclick={() => (activeTab = 0)}>DigiKeys</button>
				<button class="tab-btn" class:active={activeTab === 1} onclick={() => (activeTab = 1)}>Upgrades</button>
				<button class="tab-btn" class:active={activeTab === 2} onclick={() => (activeTab = 2)}>Furniture</button>
			</div>
		{/if}
	</AppContainer>
{/if}

<Confirm
	showing={removingMyKey}
	title="Remove DigiKey?"
	description="Removing the DigiKey will revoke access to this property and shared assets. Are you sure?"
	onAccept={confirmRemoveMyKey}
	onDeny={() => (removingMyKey = false)}
/>

<Modal showing={keyCreating} title={keyUpdating ? 'Update DigiKey' : 'Create New DigiKey'} acceptLabel={keyUpdating ? 'Update' : 'Create'} onAccept={submitKey} onClose={() => (keyCreating = false)}>
	{#if keySubmitting}<Loader static text={keyUpdating ? 'Updating DigiKey' : 'Creating DigiKey'} />{/if}
	<label class="field">
		<span>Target State ID</span>
		<input type="text" inputmode="numeric" bind:value={keyTarget} disabled={keySubmitting || keyUpdating} />
	</label>
	<div class="perm-list">
		<span class="perm-label">Permissions</span>
		{#each PROPERTY_PERMISSIONS as p (p.value)}
			<label class="perm-row">
				<input type="checkbox" checked={Boolean(keyPermissions[p.value])} disabled={keySubmitting} onchange={() => toggleKeyPermission(p.value)} />
				{p.name}
			</label>
		{/each}
	</div>
</Modal>

<Confirm
	showing={revokingKey !== null}
	title="Revoke DigiKey?"
	description="Removing the DigiKey will revoke access to this property and shared assets for this person. Are you sure?"
	onAccept={confirmRevokeKey}
	onDeny={() => (revokingKey = null)}
/>

<Confirm
	showing={buyingUpgrade !== null}
	title={`Purchase ${buyingUpgrade ? upgradeLevels(buyingUpgrade.type)[buyingUpgrade.nextIndex]?.name : ''}?`}
	description="Money will be taken from your main bank account. Purchases may not be refunded."
	onAccept={confirmBuyUpgrade}
	onDeny={() => (buyingUpgrade = null)}
/>

<Modal showing={interiorModalOpen} title="Upgrade Interior" acceptLabel="Close" onAccept={() => (interiorModalOpen = false)} onClose={() => (interiorModalOpen = false)}>
	<p class="interior-warning">Upgrading the Interior Will <b>RESET</b> All Placed Furniture!</p>
	<p class="interior-warning"><i>Money will be taken from your main bank account.</i></p>
	{#if availableUpgrades}
		{@const cur = currentInterior()}
		{#each [...availableUpgrades.interior.levels].sort((a, b) => a.price - b.price) as int (int.id)}
			<div class="interior-row">
				<span class="interior-main">
					<span class="interior-name">{int.name}</span>
					<span class="interior-sub">${(cur ? interiorPrice(cur.price, int.price) : int.price).toLocaleString('en-US')} - {int.info?.description}</span>
				</span>
				<button class="icon-btn" disabled={int.id === cur?.id} onclick={() => previewInterior(int.id)} aria-label="Preview"><Icon name="eye" size="14px" /></button>
				<button class="icon-btn" disabled={int.id === cur?.id} onclick={() => (purchasingInterior = { id: int.id, name: int.name })} aria-label="Purchase"><Icon name="bag-shopping" size="14px" /></button>
			</div>
		{/each}
	{/if}
</Modal>

<Confirm showing={purchasingInterior !== null} title={`Purchase Interior ${purchasingInterior?.name}?`} onAccept={confirmBuyInterior} onDeny={() => (purchasingInterior = null)} />

<Modal showing={choosingFurniture} title="Place New Item" acceptLabel="Close" onAccept={() => (choosingFurniture = false)} onClose={() => (choosingFurniture = false)}>
	<p class="interior-warning"><i>You can browse through a category once in placement mode by using your arrow keys!</i></p>
	<label class="field">
		<span>Category</span>
		<Dropdown
			bind:value={selectedCat}
			options={[{ value: 'search', label: 'Search' }, ...Object.keys(furnitureCats ?? {}).map((c) => ({ value: c, label: furnitureCats?.[c]?.name ?? c }))]}
		/>
	</label>
	{#if selectedCat === 'search'}
		<label class="field">
			<span>Search Furniture</span>
			<input bind:value={furnitureSearch} />
		</label>
	{/if}
	<div class="catalog-list">
		{#each catalogEntries as m (m)}
			<button class="catalog-row" onclick={() => chooseFurniture(m)}>
				<span class="catalog-name">{furnitureCatalog?.[m]?.name}</span>
				<span class="catalog-sub">{furnitureCatalog?.[m]?.model}</span>
			</button>
		{/each}
	</div>
</Modal>

<style>
	.header-action,
	.icon-btn,
	.furn-btn {
		background: none;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		padding: 6px 9px;
	}

	.header-action:disabled,
	.icon-btn:disabled {
		opacity: 0.4;
	}

	.empty {
		text-align: center;
		margin-top: 25%;
		font-size: 16px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.empty.small {
		margin-top: 10px;
		font-size: 13px;
	}

	/* dark rounded cards + circular icon badge, matches Bank/Garage/Crypto/Services */
	.prop-list,
	.key-list,
	.upgrade-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px;
	}

	.prop-row,
	.key-row,
	.upgrade-row {
		width: 100%;
		background: var(--color-bg-panel);
		border: none;
		border-radius: 14px;
		box-shadow: var(--shadow-card);
		padding: 11px 14px;
		display: flex;
		align-items: center;
		gap: 12px;
		text-align: left;
		color: var(--color-text);
	}

	.interior-row {
		width: 100%;
		background: none;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding: 10px 14px;
		display: flex;
		align-items: center;
		gap: 10px;
		text-align: left;
		color: var(--color-text);
	}

	.prop-row {
		justify-content: space-between;
		cursor: pointer;
	}

	.prop-row:hover {
		background: var(--color-bg-panel-alt);
	}

	.row-badge {
		flex-shrink: 0;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.06);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-primary-light);
	}

	.prop-main,
	.key-main,
	.upgrade-main,
	.interior-main,
	.furniture-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: 2px;
	}

	.prop-name,
	.key-name,
	.upgrade-name,
	.interior-name,
	.furniture-name {
		font-size: 14px;
	}

	.prop-sub,
	.key-sub,
	.upgrade-sub,
	.interior-sub,
	.furniture-sub {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.tab-body {
		height: calc(100% - 42px);
		overflow-y: auto;
		overflow-x: hidden;
		position: relative;
	}

	.tab-bar {
		display: flex;
		height: 42px;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.tab-btn {
		flex: 1;
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 12.5px;
		font-weight: 600;
		cursor: pointer;
	}

	.tab-btn.active {
		color: var(--color-primary);
		border-bottom: 2px solid var(--color-primary);
	}

	.fab {
		position: absolute;
		bottom: 16px;
		right: 16px;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: none;
		background: var(--color-primary);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: var(--shadow-card);
	}

	.toggle-edit {
		display: block;
		width: 90%;
		margin: 10px auto;
		padding: 10px;
		background: var(--color-success);
		color: #fff;
		border: none;
		border-radius: var(--radius);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}

	.furniture-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px;
	}

	.furniture-card {
		background: var(--color-bg-panel);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.furniture-summary {
		width: 100%;
		background: none;
		border: none;
		padding: 12px 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
		color: var(--color-text);
		gap: 10px;
	}

	.furniture-actions {
		display: flex;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.furn-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 10px;
	}

	.furn-btn:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 10px;
	}

	.field span {
		font-size: 12px;
		color: var(--color-text-alt);
	}

	.field input {
		background: transparent;
		border: var(--border-input);
		border-radius: var(--radius);
		padding: 8px 10px;
		font-size: 14px;
		color: var(--color-text);
		outline: none;
		font-family: inherit;
	}

	.field input:disabled {
		opacity: 0.5;
	}

	.perm-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 10px;
	}

	.perm-label {
		font-size: 12px;
		color: var(--color-text-alt);
		margin-bottom: 2px;
	}

	.perm-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--color-text);
	}

	.interior-warning {
		font-size: 12px;
		color: var(--color-text-alt);
		margin: 4px 0;
	}

	.catalog-list {
		display: flex;
		flex-direction: column;
		max-height: 220px;
		overflow-y: auto;
		margin-top: 6px;
	}

	.catalog-row {
		background: none;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding: 8px 4px;
		display: flex;
		flex-direction: column;
		text-align: left;
		cursor: pointer;
		color: var(--color-text);
	}

	.catalog-row:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.catalog-name {
		font-size: 13px;
	}

	.catalog-sub {
		font-size: 12.5px;
		color: var(--color-text-muted);
	}
</style>
