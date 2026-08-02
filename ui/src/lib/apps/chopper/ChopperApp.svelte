<!-- LSUnderground chop-shop client: chop lists + reputation, restricted to ACCESS_CHOPPER state.
	 "chopper" means car-chopping (stripping stolen vehicles), not helicopters. -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Loader from '../../primitives/Loader.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import Tabs from '../../primitives/Tabs.svelte';
	import { Nui } from '../../nui';
	import type { ChopList, ChopperDetails } from '../../types';

	let details = $state<ChopperDetails | null>(null);
	let loaded = $state(false);
	let tab = $state('list');
	let openListKey = $state<string | null>(null);

	$effect(() => {
		if (!loaded) {
			loaded = true;
			Nui.chopperGetDetails().then((res) => {
				if (res) details = res;
			});
		}
	});

	const chopListEntries = $derived(details ? Object.entries(details.chopList) : []);
	const openList = $derived(openListKey && details ? details.chopList[openListKey] : null);

	function listLabel(key: string, list: ChopList): string {
		return list.id ? key : `${key} Chop List`;
	}

	function listSub(list: ChopList): string {
		const kind = list.public ? 'Shared Chop List' : list.id ? 'Personal Chop List' : '';
		const count = list.list.length;
		return `${kind} - ${count} Remaining ${count === 1 ? 'Vehicle' : 'Vehicles'}`;
	}

	function normalise(rep: ChopperDetails['reputations'][number]): number {
		const min = rep.current?.value ?? 0;
		const max = rep.next?.value ?? 1000;
		if (max === min) return 100;
		return Math.max(0, Math.min(100, ((rep.value - min) * 100) / (max - min)));
	}
</script>

<AppContainer appId="chopper" useAppColor={true}>
	{#if !loaded}
		<Loader static text="Loading" />
	{:else if details?.banned}
		<div class="empty">Banned</div>
	{:else if details}
		<div class="chopper">
			<div class="content">
				{#if tab === 'list'}
					{#if chopListEntries.length === 0}
						<div class="empty">You Have No Choplist Available</div>
					{:else}
						<div class="list">
							{#each chopListEntries as [key, list] (key)}
								<button class="list-row" onclick={() => (openListKey = key)}>
									<span class="list-name">{listLabel(key, list)}</span>
									<span class="list-sub">{listSub(list)}</span>
								</button>
							{/each}
						</div>
					{/if}
				{:else if details.reputations.length === 0}
					<div class="empty">No Reputation Built</div>
				{:else}
					<div class="list">
						{#each details.reputations as rep (rep.id)}
							<div class="rep-card">
								<div class="rep-title">{rep.label}</div>
								<div class="rep-row">
									<span class="rep-rank">{rep.current?.label ?? 'No Rank'}</span>
									<div class="rep-bar"><div class="rep-fill" style:width={`${normalise(rep)}%`}></div></div>
									<span class="rep-rank">{rep.next?.label ?? 'Unknown'}</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
			<Tabs tabs={[{ id: 'list', label: 'Chop List' }, { id: 'rep', label: 'Reputation' }]} bind:active={tab} />
		</div>
	{/if}
</AppContainer>

<Modal
	showing={openList !== null}
	title={openListKey ? `${openListKey} Chop List` : ''}
	acceptLabel="Close"
	closeLabel="Close"
	onAccept={() => (openListKey = null)}
	onClose={() => (openListKey = null)}
>
	{#if openList}
		{#each [...openList.list].sort((a, b) => Number(b.hv) - Number(a.hv)) as req, i (i)}
			<div class="chop-item">
				{#if req.hv}<Icon name="gem" size="13px" />{/if}
				{req.name}
			</div>
		{/each}
	{/if}
</Modal>

<style>
	.chopper {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.content {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
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

	.list-row {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		background: var(--color-bg-panel);
		border: none;
		border-radius: 12px;
		padding: 12px 14px;
		box-shadow: var(--shadow-card);
		cursor: pointer;
		text-align: left;
	}

	.list-name {
		font-size: 15px;
		font-weight: 700;
		color: var(--color-text);
	}

	.list-sub {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.rep-card {
		background: var(--color-bg-panel);
		border-radius: 12px;
		padding: 12px 14px;
		box-shadow: var(--shadow-card);
	}

	.rep-title {
		text-align: center;
		font-size: 16px;
		font-weight: 700;
		color: var(--color-primary-light);
		margin-bottom: 8px;
	}

	.rep-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.rep-rank {
		font-size: 12.5px;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.rep-bar {
		flex: 1;
		height: 6px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}

	.rep-fill {
		height: 100%;
		background: var(--color-primary);
	}

	.chop-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px;
		background: var(--color-secondary-dark);
		border-radius: 8px;
		margin-bottom: 6px;
		color: var(--color-primary-light);
		font-weight: 700;
	}

	.chop-item :global(svg) {
		color: gold;
	}
</style>
