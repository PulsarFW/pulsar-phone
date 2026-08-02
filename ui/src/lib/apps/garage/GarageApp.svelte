<!-- vehicle list + detail view -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Loader from '../../primitives/Loader.svelte';
	import { dataState } from '../../store/data.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { GarageInfo, GarageVehicle } from '../../types';

	const view = $derived(navState.route.startsWith('view/') ? 'view' : 'list');
	const targetVin = $derived(navState.route.startsWith('view/') ? navState.route.slice('view/'.length) : '');

	let vehicles = $state<GarageVehicle[]>([]);
	let loading = $state(false);
	let loaded = $state(false);

	async function load() {
		loading = true;
		const res = await Nui.garageGetCars();
		vehicles = res || [];
		loading = false;
		loaded = true;
	}

	$effect(() => {
		if (!loaded) load();
	});

	const garages = $derived((dataState.extra.garages as Record<string, GarageInfo> | undefined) ?? {});

	function garageOf(vehicle: GarageVehicle): GarageInfo | undefined {
		if (vehicle.Storage.Type === 0) return garages.impound;
		if (vehicle.Storage.Type === 1) return garages[String(vehicle.Storage.Id)];
		return vehicle.PropertyStorage;
	}

	function statusText(vehicle: GarageVehicle): string {
		if (vehicle.Spawned) return 'Out';
		return vehicle.Storage.Type === 0 ? 'In Impound' : 'In Garage';
	}

	const viewedCar = $derived(vehicles.find((v) => v.VIN === targetVin));

	$effect(() => {
		if (view === 'view' && loaded && !viewedCar) navigateToApp('garage');
	});

	async function trackVehicle() {
		if (!targetVin) return;
		const ok = await Nui.garageTrackVehicle(targetVin);
		pushAlert(ok ? 'Vehicle Marked on GPS' : 'Unable To Mark Vehicle', ok ? undefined : 'error');
	}

	function bodyEngineLabel(value: number | undefined): string {
		const pct = Math.ceil(((value ?? 1000) / 1000) * 100);
		return diagnosticLabel(pct);
	}

	function partLabel(value: number): string {
		return diagnosticLabel(Math.ceil(value));
	}

	function diagnosticLabel(pct: number): string {
		if (pct >= 90) return 'Excellent';
		if (pct >= 70) return 'Good';
		if (pct >= 50) return 'Fair';
		if (pct >= 30) return 'Needs Work';
		return 'Poor';
	}

	function splitCamel(key: string): string {
		return key.replace(/([a-z])([A-Z])/g, '$1 $2');
	}

	function holdRemaining(expiresAt: number): string {
		const diff = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
		if (diff < 60) return 'less than a minute';
		if (diff < 3600) return `${Math.floor(diff / 60)}m`;
		return `${Math.floor(diff / 3600)}h`;
	}
</script>

{#if view === 'list'}
	<AppContainer appId="garage" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={load} disabled={loading} aria-label="Refresh Garage"><Icon name="arrows-rotate" size="20px" /></button>
		{/snippet}
		{#if loading && !loaded}
			<Loader static text="Loading Garage" />
		{:else if vehicles.length === 0}
			<div class="empty">You Have No Vehicles</div>
		{:else}
			<div class="list">
				{#each vehicles as vehicle (vehicle.VIN)}
					{@const garage = garageOf(vehicle)}
					<button class="vehicle-row" onclick={() => navigateToApp('garage', `view/${vehicle.VIN}`)}>
						<span class="vehicle-name">{vehicle.Make} {vehicle.Model}</span>
						<span class="vehicle-sub">
							{garage?.label ?? 'Unknown'}
							<span class="status" class:spawned={vehicle.Spawned}>{statusText(vehicle)}</span>
						</span>
					</button>
				{/each}
			</div>
		{/if}
	</AppContainer>
{:else if viewedCar}
	<AppContainer appId="garage" title={`${viewedCar.Make} ${viewedCar.Model}`} useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={trackVehicle} aria-label="Route To Vehicle"><Icon name="location-crosshairs" size="20px" /></button>
		{/snippet}
		<div class="view">
			<div class="subheader">
				<span>VIN: {viewedCar.VIN}</span>
				<span>Plate: {viewedCar.RegisteredPlate}</span>
			</div>
			<div class="content">
				<div class="section">
					<h3>Storage</h3>
					<div class="storage-line">
						{garageOf(viewedCar)?.label ?? 'Unknown'}
						<span class="status" class:spawned={viewedCar.Spawned}>{statusText(viewedCar)}</span>
					</div>
					{#if viewedCar.Storage.Type === 0}
						<div class="detail-row"><span>Fine</span><span>${viewedCar.Storage.Fine ?? 0}</span></div>
						{#if viewedCar.Storage.TimeHold}
							<div class="detail-row"><span>Hold Release</span><span>{holdRemaining(viewedCar.Storage.TimeHold.ExpiresAt)}</span></div>
						{/if}
					{/if}
				</div>
				<div class="section">
					<h3>Diagnostics</h3>
					<div class="detail-row"><span>Mileage</span><span>{viewedCar.Mileage ?? 0} Miles</span></div>
					<div class="detail-row"><span>Body</span><span>{bodyEngineLabel(viewedCar.Damage?.Body)}</span></div>
					<div class="detail-row"><span>Engine</span><span>{bodyEngineLabel(viewedCar.Damage?.Engine)}</span></div>
					{#each Object.entries(viewedCar.DamagedParts ?? {}) as [part, value] (part)}
						<div class="detail-row"><span>{splitCamel(part)}</span><span>{partLabel(value)}</span></div>
					{/each}
				</div>
			</div>
		</div>
	</AppContainer>
{/if}

<style>
	.header-action {
		background: none;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		padding: 6px 9px;
	}

	.header-action:disabled {
		opacity: 0.4;
	}

	.empty {
		text-align: center;
		margin-top: 25%;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.list {
		padding: 10px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.vehicle-row {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 3px;
		background: var(--color-bg-panel);
		border: none;
		border-radius: 12px;
		padding: 12px 14px;
		box-shadow: var(--shadow-card);
		cursor: pointer;
		text-align: left;
	}

	.vehicle-name {
		font-size: 15px;
		font-weight: 700;
		color: var(--color-text);
	}

	.vehicle-sub {
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	.status {
		color: var(--color-success);
	}

	.status::before {
		content: ' - ';
	}

	.status.spawned {
		color: var(--color-error-light);
	}

	.view {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.subheader {
		display: flex;
		justify-content: space-around;
		background: var(--color-secondary-dark);
		padding: 12px;
		font-size: 14px;
		color: var(--color-text-alt);
	}

	.content {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 10px;
	}

	.section {
		background: var(--color-bg-panel);
		border-radius: 12px;
		padding: 12px 14px;
		box-shadow: var(--shadow-card);
		margin-bottom: 12px;
	}

	.section h3 {
		margin: 0 0 8px;
		font-size: 15px;
		color: var(--color-text);
		padding-bottom: 6px;
		border-bottom: 1px solid var(--color-primary);
	}

	.storage-line {
		font-size: 15px;
		color: var(--color-text);
		margin-bottom: 4px;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		font-size: 14px;
		padding: 5px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		color: var(--color-text-alt);
	}
</style>
