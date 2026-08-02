<!-- Dynasty 8 real estate agent tool: search, expandable property cards, sell w/ loan terms and credit check - restricted to the realestate job -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Loader from '../../primitives/Loader.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import Dropdown from '../../primitives/Dropdown.svelte';
	import { dataState } from '../../store/data.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { CreditCheckResult, Dyn8Property } from '../../types';

	const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
	const canSell = $derived(Boolean(dataState.permissions.JOB_SELL));

	let term = $state('');
	let results = $state<Dyn8Property[]>([]);
	let loading = $state(false);
	let searched = $state(false);
	let expanded = $state<number | null>(null);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	function onTermInput() {
		searched = false;
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(runSearch, 600);
	}

	async function runSearch() {
		if (!term.trim()) return;
		loading = true;
		const res = await Nui.dyn8Search(term.trim());
		results = res || [];
		loading = false;
		searched = true;
	}

	async function markProperty(id: number) {
		const ok = await Nui.dyn8MarkProperty(id);
		pushAlert(ok ? 'GPS Marked' : 'Unable To Mark GPS', ok ? undefined : 'error');
	}

	// sell
	let selling = $state<{ property: Dyn8Property; target: string; loan: boolean; deposit: number; time: number } | null>(null);
	let confirmingSale = $state(false);

	function startSell(property: Dyn8Property) {
		if (!canSell) return;
		selling = { property, target: '', loan: false, deposit: 20, time: 8 };
	}

	function loanAfterInterest(full: number, downpayment: number): number {
		return Math.round((full - downpayment) * 1.15);
	}

	async function confirmSale() {
		if (!selling) return;
		const { property, target, loan, deposit, time } = selling;
		confirmingSale = false;
		selling = null;
		const id = Number(target);
		if (!target || Number.isNaN(id)) {
			pushAlert('Invalid Target', 'error');
			return;
		}
		const res = await Nui.dyn8SellProperty(property._id, id, loan, deposit, time);
		if (res === 'OK' || !res.error) {
			pushAlert('Notification of Sale Sent To Client');
		} else {
			const messages = ['Not on Duty', 'Invalid Property', 'Property Already Being Sold', 'Invalid Target'];
			pushAlert(messages[res.code ?? -1] ?? 'Unable To Start Sale', 'error');
		}
	}

	// credit check
	let checkingCredit = $state(false);
	let creditTarget = $state('');
	let creditResult = $state<CreditCheckResult | null>(null);

	async function submitCreditCheck() {
		const id = Number(creditTarget);
		if (!creditTarget || Number.isNaN(id)) {
			pushAlert('Invalid Target', 'error');
			return;
		}
		checkingCredit = false;
		const res = await Nui.dyn8CheckCredit(id);
		if (res) creditResult = res;
		else pushAlert('Error', 'error');
	}
</script>

<AppContainer appId="dyn8" useAppColor={true}>
	{#snippet actions()}
		{#if canSell}
			<button class="header-action" onclick={() => (checkingCredit = true)} aria-label="Check Credit"><Icon name="credit-card" size="20px" /></button>
		{/if}
	{/snippet}
	<div class="dyn8">
		<div class="search-row">
			<input class="search-input" placeholder="Search Property" bind:value={term} oninput={onTermInput} onkeydown={(e) => e.key === 'Enter' && runSearch()} />
			<button class="search-btn" onclick={runSearch} aria-label="Search"><Icon name="magnifying-glass-location" size="15px" /></button>
		</div>
		<div class="content">
			{#if loading}
				<Loader static text="Loading" />
			{:else if results.length > 0}
				{#each results as property, i (property._id ?? i)}
					<div class="property">
						<button class="property-head" onclick={() => (expanded = expanded === i ? null : i)}>
							<span>{property.label}</span>
							<Icon name={expanded === i ? 'chevron-up' : 'chevron-down'} size="12px" />
						</button>
						{#if expanded === i}
							<div class="property-body">
								<div class="detail-row"><span>Address</span><span>{property.label}</span></div>
								<div class="detail-row"><span>Sold</span><span>{property.sold ? 'Yes' : 'No'}</span></div>
								<div class="detail-row">
									<span>Home Owner</span>
									<span>{property.owner ? `${property.owner.First} ${property.owner.Last}` : 'No Owner'}</span>
								</div>
								{#if !property.sold}
									<div class="property-actions">
										<button class="text-btn" onclick={() => markProperty(property._id)}>Mark Property</button>
										{#if canSell}
											<button class="text-btn" onclick={() => startSell(property)}>Sell Property</button>
										{/if}
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			{:else if searched}
				<div class="empty error">No Search Results</div>
			{/if}
		</div>
	</div>
</AppContainer>

<Modal
	showing={selling !== null}
	title={selling ? `Sell ${selling.property.label}` : ''}
	acceptLabel="Begin Sale"
	closeLabel="Cancel"
	onAccept={() => (confirmingSale = true)}
	onClose={() => (selling = null)}
>
	{#if selling}
		<label class="field">
			<span>Price</span>
			<input disabled value={usd.format(selling.property.price ?? 0)} />
		</label>
		<label class="field">
			<span>Type</span>
			<Dropdown
				bind:value={selling.loan}
				options={[
					{ value: true, label: 'Loan' },
					{ value: false, label: 'Cash Sale' },
				]}
			/>
		</label>
		{#if selling.loan}
			{@const downpayment = Math.ceil((selling.property.price ?? 0) * (selling.deposit / 100))}
			{@const remaining = loanAfterInterest(selling.property.price ?? 0, downpayment)}
			<p class="loan-line">Deposit: {usd.format(downpayment)}</p>
			<input type="range" min="20" max="75" step="5" bind:value={selling.deposit} />
			<p class="loan-line">Length: {selling.time} Weeks</p>
			<input type="range" min="8" max="24" step="1" bind:value={selling.time} />
			<p class="loan-line">Remaining Cost After Interest: {usd.format(remaining)}</p>
			<p class="loan-line">Weekly Payments: {usd.format(remaining / selling.time)}</p>
		{/if}
		<label class="field">
			<span>Target State ID</span>
			<input type="tel" bind:value={selling.target} />
		</label>
	{/if}
</Modal>

<Modal
	showing={confirmingSale}
	title="Start Sale?"
	acceptLabel="Yes"
	closeLabel="No"
	onAccept={confirmSale}
	onClose={() => (confirmingSale = false)}
>
	<p>By starting this sale, nobody else will be able to begin the sale process for this property until the client either declines the sale or it times out (~30 minutes).</p>
</Modal>

<Modal showing={checkingCredit} title="Check Credit" acceptLabel="Check Credit" closeLabel="Cancel" onAccept={submitCreditCheck} onClose={() => (checkingCredit = false)}>
	<label class="field">
		<span>Target State ID</span>
		<input type="tel" bind:value={creditTarget} />
	</label>
</Modal>

<Modal
	showing={creditResult !== null}
	title="Credit Check Results"
	acceptLabel="Okay"
	closeLabel="Dismiss"
	onAccept={() => (creditResult = null)}
	onClose={() => (creditResult = null)}
>
	{#if creditResult}
		<p>
			{creditResult.First} {creditResult.Last} has a credit score of {creditResult.Score} so can take out a loan of up to {usd.format(creditResult.Amount)}.
		</p>
	{/if}
</Modal>

<style>
	.header-action {
		background: none;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		padding: 6px 9px;
	}

	.dyn8 {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.search-row {
		display: flex;
		gap: 8px;
		padding: 10px;
	}

	.search-input {
		flex: 1;
		background: rgba(255, 255, 255, 0.06);
		border: var(--border-input);
		border-radius: var(--radius);
		padding: 8px 12px;
		color: var(--color-text);
		font-size: 14px;
		outline: none;
	}

	.search-btn {
		background: var(--color-primary);
		border: none;
		border-radius: var(--radius);
		width: 38px;
		color: #fff;
		cursor: pointer;
	}

	.content {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 0 10px 10px;
	}

	.empty.error {
		text-align: center;
		margin-top: 20%;
		font-size: 15px;
		font-weight: 700;
		color: var(--color-error-light);
	}

	.property {
		background: var(--color-bg-panel);
		border-radius: 12px;
		box-shadow: var(--shadow-card);
		margin-bottom: 6px;
		overflow: hidden;
	}

	.property-head {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: none;
		border: none;
		padding: 12px 14px;
		font-size: 14.5px;
		font-weight: 600;
		color: var(--color-text);
		cursor: pointer;
	}

	.property-body {
		padding: 0 14px 12px;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		padding: 6px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		color: var(--color-text-alt);
	}

	.property-actions {
		display: flex;
		gap: 10px;
		margin-top: 10px;
	}

	.text-btn {
		background: none;
		border: none;
		color: var(--color-primary-light);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		padding: 4px 0;
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
	}

	.loan-line {
		font-size: 13px;
		color: var(--color-text-alt);
		margin: 6px 0;
	}
</style>
