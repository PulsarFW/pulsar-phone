<!-- Ads (classifieds) - one active ad per player, keyed by their server source id in a dict pushed via
	 SET_DATA/ADD_DATA/UPDATE_DATA/REMOVE_DATA (see data.svelte.ts's DICT_KEYS), not a per-player list. -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import AppInput from '../../primitives/AppInput.svelte';
	import Confirm from '../../primitives/Confirm.svelte';
	import { dataState } from '../../store/data.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { Advert } from '../../types';

	const CATEGORIES = [
		{ label: 'Services', color: '#4caf50' },
		{ label: 'Want-To-Buy', color: '#f44336' },
		{ label: 'Want-To-Sell', color: '#2196f3' },
		{ label: 'Help Wanted', color: '#ff5722' },
	];

	const view = $derived.by(() => {
		if (navState.route === 'add') return 'add';
		if (navState.route === 'edit') return 'edit';
		if (navState.route.startsWith('category-view/')) return 'category';
		if (navState.route.startsWith('view/')) return 'view';
		return 'list';
	});
	const targetCategory = $derived(navState.route.startsWith('category-view/') ? decodeURIComponent(navState.route.slice('category-view/'.length)) : '');
	const targetId = $derived(navState.route.startsWith('view/') ? Number(navState.route.slice('view/'.length)) : null);

	const adverts = $derived((dataState.extra.adverts as Record<string, Advert> | undefined) ?? {});
	const advertList = $derived(
		Object.keys(adverts)
			.filter((k) => k !== '0')
			.map((k) => adverts[k])
			.sort((a, b) => b.time - a.time),
	);

	const myId = $derived(dataState.player?.Source);
	const myAdvert = $derived(myId !== undefined ? adverts[String(myId)] : undefined);

	const categoryAdverts = $derived(advertList.filter((ad) => ad.categories.includes(targetCategory)));
	const viewedAdvert = $derived(advertList.find((ad) => ad.id === targetId));

	$effect(() => {
		if (view === 'view' && targetId !== null && !viewedAdvert && advertList.length > 0) navigateToApp('adverts');
	});

	function catColor(label: string): string {
		return CATEGORIES.find((c) => c.label === label)?.color ?? '#888';
	}

	function timeAgo(ms: number): string {
		const diff = Math.max(0, Date.now() - ms);
		if (diff < 60_000) return 'just now';
		if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
		if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
		return `${Math.floor(diff / 86400_000)}d ago`;
	}

	async function callAdvert(ad: Advert) {
		if (ad.id === myId) return;
		const ok = await Nui.createCall(ad.number);
		if (ok) navigateToApp('phone', `call/${ad.number}`);
		else pushAlert('Unable To Start Call', 'error');
	}

	function textAdvert(ad: Advert) {
		if (ad.id === myId) return;
		navigateToApp('messages', `convo/${ad.number}`);
	}

	// create / edit form
	let formTitle = $state('');
	let formPrice = $state('');
	let formFull = $state('');
	let formCategories = $state<string[]>([]);

	$effect(() => {
		if (view === 'add') {
			formTitle = '';
			formPrice = '';
			formFull = '';
			formCategories = [];
		} else if (view === 'edit' && myAdvert) {
			formTitle = myAdvert.title;
			formPrice = String(myAdvert.price ?? '');
			formFull = myAdvert.full;
			formCategories = [...myAdvert.categories];
		}
	});

	function toggleCategory(label: string) {
		formCategories = formCategories.includes(label) ? formCategories.filter((c) => c !== label) : [...formCategories, label];
	}

	async function submitCreate() {
		if (!formTitle.trim() || !dataState.player) return;
		const id = dataState.player.Source ?? 0;
		await Nui.advertsCreate({
			id,
			title: formTitle.trim(),
			price: formPrice.trim(),
			full: formFull.trim(),
			categories: formCategories,
			author: `${dataState.player.First} ${dataState.player.Last}`,
			number: dataState.player.Phone,
			time: Date.now(),
		});
		pushAlert('Advert Created');
		navigateToApp('adverts');
	}

	async function submitEdit() {
		if (!myAdvert || !formTitle.trim()) return;
		const updated: Advert = { ...myAdvert, title: formTitle.trim(), price: formPrice.trim(), full: formFull.trim(), categories: formCategories };
		await Nui.advertsUpdate(updated);
		pushAlert('Advert Updated');
		navigateToApp('adverts');
	}

	async function bumpAdvert() {
		if (!myAdvert) return;
		await Nui.advertsUpdate({ ...myAdvert, time: Date.now() });
		pushAlert('Advertisement Bumped');
	}

	let confirmingDelete = $state(false);
	async function confirmDelete() {
		confirmingDelete = false;
		await Nui.advertsDelete();
		pushAlert('Advertisement Deleted');
		navigateToApp('adverts');
	}

	const canBump = $derived(Boolean(myAdvert) && Date.now() - (myAdvert?.time ?? 0) > 1000 * 60 * 30);
</script>

{#if view === 'list' || view === 'category'}
	<AppContainer appId="adverts" title={view === 'category' ? targetCategory : 'Ads'} useAppColor={true}>
		{#snippet actions()}
			{#if myAdvert}
				{#if canBump}
					<button class="header-action" onclick={bumpAdvert} aria-label="Bump Ad"><Icon name="upload" size="20px" /></button>
				{/if}
				<button class="header-action" onclick={() => navigateToApp('adverts', 'edit')} aria-label="Edit Ad"><Icon name="pen-to-square" size="20px" /></button>
				<button class="header-action" onclick={() => (confirmingDelete = true)} aria-label="Delete Ad"><Icon name="trash" size="20px" /></button>
			{:else}
				<button class="header-action" onclick={() => navigateToApp('adverts', 'add')} aria-label="Post Ad"><Icon name="plus" size="20px" /></button>
			{/if}
		{/snippet}
		<div class="ads-list">
			{#each view === 'category' ? categoryAdverts : advertList as ad (ad.id)}
				<div class="ad-row">
					<button class="ad-info" onclick={() => navigateToApp('adverts', `view/${ad.id}`)}>
						<span class="ad-title">{ad.title}</span>
						<span class="ad-meta">
							<span class="ad-time">{timeAgo(ad.time)}</span>
							{#if ad.id === myId}<span class="ad-yours">Your Ad</span>{/if}
							{#if ad.price}
								<span class="ad-price">${ad.price}</span>
							{:else}
								<span class="ad-negotiable">Price Negotiable</span>
							{/if}
						</span>
					</button>
					{#if ad.id !== myId}
						<button class="ad-call" onclick={() => callAdvert(ad)} aria-label={`Call ${ad.title}`}><Icon name="phone" size="16px" /></button>
					{/if}
				</div>
			{:else}
				<div class="empty">No Ads {view === 'category' ? 'In This Category' : 'Yet'}</div>
			{/each}
		</div>
	</AppContainer>
{:else if view === 'view' && viewedAdvert}
	<AppContainer appId="adverts" title={viewedAdvert.title} useAppColor={true}>
		{#snippet actions()}
			{#if viewedAdvert.id === myId}
				{#if canBump}
					<button class="header-action" onclick={bumpAdvert} aria-label="Bump Ad"><Icon name="upload" size="20px" /></button>
				{/if}
				<button class="header-action" onclick={() => navigateToApp('adverts', 'edit')} aria-label="Edit Ad"><Icon name="pen-to-square" size="20px" /></button>
				<button class="header-action" onclick={() => (confirmingDelete = true)} aria-label="Delete Ad"><Icon name="trash" size="20px" /></button>
			{:else}
				<button class="header-action" onclick={() => callAdvert(viewedAdvert)} aria-label="Call"><Icon name="phone" size="20px" /></button>
				<button class="header-action" onclick={() => textAdvert(viewedAdvert)} aria-label="Text"><Icon name="comment-sms" size="20px" /></button>
			{/if}
		{/snippet}
		<div class="ad-view">
			<div class="ad-sub-bar">
				<span>{viewedAdvert.author}</span>
				<span>{timeAgo(viewedAdvert.time)}</span>
			</div>
			<div class="ad-price-bar">
				{#if viewedAdvert.price}<span class="ad-price">${viewedAdvert.price}</span>{:else}<span>Price Negotiable</span>{/if}
			</div>
			<div class="ad-body">{viewedAdvert.full}</div>
			<div class="ad-cats">
				{#each viewedAdvert.categories as cat (cat)}
					<button class="cat-chip" style:background={catColor(cat)} onclick={() => navigateToApp('adverts', `category-view/${encodeURIComponent(cat)}`)}>
						{cat}
					</button>
				{/each}
			</div>
		</div>
	</AppContainer>
{:else if view === 'add' || view === 'edit'}
	<AppContainer appId="adverts" title={view === 'add' ? 'Post New Ad' : 'Edit Ad'} useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('adverts')} aria-label="Cancel"><Icon name="xmark" size="20px" /></button>
			<button class="header-action" onclick={view === 'add' ? submitCreate : submitEdit} disabled={!formTitle.trim()} aria-label="Save">
				<Icon name="floppy-disk" size="20px" />
			</button>
		{/snippet}
		<div class="form">
			<AppInput label="Title" bind:value={formTitle} accent="#f9a825" maxlength={32} />
			<div class="cat-picker">
				<span class="cat-picker-label">Tags</span>
				<div class="cat-cells">
					{#each CATEGORIES as cat (cat.label)}
						<button class="cat-chip" class:active={formCategories.includes(cat.label)} style:background={cat.color} onclick={() => toggleCategory(cat.label)}>
							{cat.label}
						</button>
					{/each}
				</div>
			</div>
			<AppInput label="Price (Leave Empty If Negotiable)" bind:value={formPrice} accent="#f9a825" maxlength={16} />
			<label class="content-field">
				<span>Description</span>
				<textarea bind:value={formFull} rows={8}></textarea>
			</label>
		</div>
	</AppContainer>
{/if}

<Confirm
	showing={confirmingDelete}
	title="Delete Ad?"
	acceptLabel="Yes"
	denyLabel="No"
	onAccept={confirmDelete}
	onDeny={() => (confirmingDelete = false)}
/>

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

	.ads-list {
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.empty {
		text-align: center;
		margin-top: 25%;
		font-size: 16px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.ad-row {
		display: flex;
		align-items: stretch;
		background: var(--color-bg-panel);
		border-radius: 12px;
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}

	.ad-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		background: none;
		border: none;
		padding: 12px 14px;
		text-align: left;
		cursor: pointer;
		min-width: 0;
	}

	.ad-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ad-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		flex-wrap: wrap;
	}

	.ad-time {
		color: var(--color-text-muted);
	}

	.ad-yours {
		color: gold;
	}

	.ad-price {
		color: var(--color-success);
	}

	.ad-negotiable {
		color: var(--color-text-muted);
	}

	.ad-call {
		flex-shrink: 0;
		width: 52px;
		background: rgba(255, 255, 255, 0.04);
		border: none;
		border-left: 1px solid rgba(255, 255, 255, 0.08);
		color: var(--color-success);
		cursor: pointer;
	}

	.ad-view {
		height: 100%;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.ad-sub-bar {
		display: flex;
		justify-content: space-between;
		padding: 10px 16px;
		background: #f9a825;
		color: #1a1a1a;
		font-size: 13px;
	}

	.ad-price-bar {
		padding: 8px 16px;
		background: var(--color-secondary-light);
		font-size: 15px;
	}

	.ad-body {
		padding: 16px;
		font-size: 14px;
		line-height: 1.6;
		color: var(--color-text);
		white-space: pre-wrap;
		overflow-wrap: break-word;
	}

	.ad-cats {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: center;
		padding: 10px 16px 16px;
	}

	.cat-chip {
		border: none;
		border-radius: 12px;
		padding: 5px 12px;
		font-size: 12.5px;
		font-weight: 700;
		color: #fff;
		cursor: pointer;
		opacity: 0.75;
	}

	.cat-chip.active {
		opacity: 1;
		box-shadow: 0 0 0 2px #fff inset;
	}

	.form {
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.cat-picker {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.cat-picker-label {
		font-size: 12px;
		color: var(--color-text-alt);
	}

	.cat-cells {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.content-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.content-field span {
		font-size: 12px;
		color: var(--color-text-alt);
	}

	.content-field textarea {
		background: transparent;
		border: var(--border-input);
		border-radius: var(--radius);
		padding: 8px 10px;
		font-size: 14px;
		color: var(--color-text);
		font-family: inherit;
		resize: none;
	}
</style>
