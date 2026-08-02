<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Loader from '../../primitives/Loader.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import { dataState } from '../../store/data.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { BankLoansData, LoanData } from '../../types';

	const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

	const view = $derived(navState.route.startsWith('view/') ? 'view' : 'list');
	const targetId = $derived(navState.route.startsWith('view/') ? navState.route.slice('view/'.length) : '');

	let bankLoans = $state<BankLoansData | null>(null);
	let loading = $state(false);
	let loaded = $state(false);
	let viewingCredit = $state(false);

	async function load() {
		loading = true;
		const res = await Nui.loansGetData();
		if (res) bankLoans = res;
		loading = false;
		loaded = true;
	}

	$effect(() => {
		if (!loaded) load();
	});

	const loans = $derived([...(bankLoans?.loans ?? [])].sort((a, b) => b.NextPayment - a.NextPayment));
	const viewedLoan = $derived(loans.find((l) => l._id === targetId));

	function actualRemaining(loan: LoanData): number {
		if (loan.Remaining <= 0) return 0;
		return Math.ceil(loan.Remaining * ((100 + loan.InterestRate) / 100));
	}

	function nextPaymentAmount(loan: LoanData, weeksOverride = 1): number {
		if (loan.Remaining <= 0) return 0;
		const remainingPayments = loan.TotalPayments - loan.PaidPayments;
		let weeks = weeksOverride;
		if (loan.MissedPayments > 1 && weeksOverride === 1) weeks = loan.MissedPayments;
		if (weeks > remainingPayments) weeks = remainingPayments;
		const eachPayment = loan.Remaining / remainingPayments;
		return Math.ceil(eachPayment * weeks * ((100 + loan.InterestRate) / 100));
	}

	function isDefaultedLook(loan: LoanData): boolean {
		return loan.Defaulted || (loan.MissablePayments > 1 && loan.MissedPayments >= loan.MissablePayments - 1);
	}

	function loanLabel(type: string): string {
		if (type === 'vehicle') return 'Auto';
		if (type === 'property') return 'Home';
		return 'Personal';
	}

	function loanIcon(type: string): string {
		if (type === 'vehicle') return 'car';
		if (type === 'property') return 'house';
		return 'question';
	}

	function identifierLabel(type: string): string {
		if (type === 'vehicle') return 'Vehicle VIN';
		if (type === 'property') return 'Property ID';
		return 'Asset ID';
	}

	function formatDate(unixSeconds: number): string {
		return new Date(unixSeconds * 1000).toLocaleDateString();
	}

	// payment
	let paying = $state(false);
	let payWeeks = $state(1);
	let payAhead = $state(false);

	function openPayment() {
		if (!viewedLoan) return;
		if (viewedLoan.Defaulted) {
			let minWeeks = 1;
			if (viewedLoan.MissedPayments > 1) {
				const remaining = viewedLoan.TotalPayments - viewedLoan.PaidPayments;
				minWeeks = Math.min(viewedLoan.MissedPayments, remaining);
			}
			payWeeks = minWeeks;
			payAhead = true;
		} else {
			payWeeks = 1;
			payAhead = false;
		}
		paying = true;
	}

	async function confirmPayment() {
		if (!viewedLoan) return;
		paying = false;
		loading = true;
		const res = await Nui.loansPayment(viewedLoan._id, payWeeks, payAhead);
		loading = false;
		if (res.success) {
			pushAlert(res.paidOff ? 'Loan Paid Off Completely!' : `Loan Payment of $${res.paymentAmount} Successful`);
			load();
		} else {
			pushAlert(res.message ?? 'Loan Payment Failed', 'error');
		}
	}
</script>

{#if view === 'list'}
	<AppContainer appId="loans" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => (viewingCredit = true)} disabled={loading} aria-label="Credit Score">
				<Icon name="award" size="20px" />
			</button>
			<button class="header-action" onclick={load} disabled={loading} aria-label="Refresh"><Icon name="arrows-rotate" size="20px" /></button>
		{/snippet}
		{#if loading && !loaded}
			<Loader static text="Loading Loans" />
		{:else if loans.length === 0}
			<div class="empty">You Have No Loans</div>
		{:else}
			<div class="list">
				{#each loans as loan (loan._id)}
					<button class="loan-card" onclick={() => navigateToApp('loans', `view/${loan._id}`)}>
						<div class="branding">
							<span>SB Financial</span>
							<small>{loanLabel(loan.Type)} Loan</small>
						</div>
						{#if loan.Remaining > 0}
							<div class="status" class:default={isDefaultedLook(loan)}>{isDefaultedLook(loan) ? 'Defaulted' : 'In Repayment'}</div>
						{:else}
							<div class="status paid">Repaid</div>
						{/if}
						<span class="type-icon"><Icon name={loanIcon(loan.Type)} size="20px" /></span>
						<div class="loan-balance">
							<div class="balance">{usd.format(actualRemaining(loan))}</div>
							<div class="loan-date">Approved {formatDate(loan.Creation)}</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</AppContainer>
{:else if viewedLoan}
	<AppContainer appId="loans" title={`${loanLabel(viewedLoan.Type)} Loan`} useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={openPayment} disabled={loading} aria-label={viewedLoan.Defaulted ? 'Pay Loan Debt' : 'Make Next Payment'}>
				<Icon name="sack-dollar" size="20px" />
			</button>
		{/snippet}
		<div class="view">
			{#if viewedLoan.Defaulted || viewedLoan.MissedPayments > 0}
				<div class="warning">
					<strong>Loan Has Defaulted</strong>
					<p>
						{#if viewedLoan.Defaulted}
							This loan has been defaulted because you missed too many payments. The asset(s) relating to this loan have been seized temporarily
							until you pay the amount missed.
						{:else}
							You missed the last {viewedLoan.MissedPayments > 1 ? `${viewedLoan.MissedPayments} payments` : 'payment'} for this loan. If {viewedLoan.MissablePayments}
							consecutive payments are missed, the loan will default and the asset(s) will be seized.
						{/if}
					</p>
				</div>
			{/if}

			<div class="balance-block">
				<div class="balance-label">Current Balance</div>
				<div class="balance-value">{actualRemaining(viewedLoan) > 0 ? usd.format(actualRemaining(viewedLoan)) : 'Loan Paid Off'}</div>
			</div>

			{#if viewedLoan.Remaining > 0}
				<div class="due-block">
					<div class="due-label">Payment Due On {formatDate(viewedLoan.NextPayment)}</div>
					<div class="due-value">{usd.format(nextPaymentAmount(viewedLoan))}</div>
				</div>
			{/if}

			<div class="section-header">Loan Details</div>
			<div class="detail-row"><span>{identifierLabel(viewedLoan.Type)}</span><span>{viewedLoan.AssetIdentifier}</span></div>
			<div class="detail-row"><span>Total Loan</span><span>{usd.format(viewedLoan.Total)}</span></div>
			<div class="detail-row"><span>Down Payment</span><span>{usd.format(viewedLoan.DownPayment)}</span></div>
			<div class="detail-row"><span>Total Paid</span><span>{usd.format(viewedLoan.Paid)}</span></div>
			<div class="detail-row"><span>Payments</span><span>{viewedLoan.PaidPayments} / {viewedLoan.TotalPayments}</span></div>
			{#if viewedLoan.MissedPayments > 0}
				<div class="detail-row"><span>Missed Payments</span><span>{viewedLoan.MissedPayments} / {viewedLoan.MissablePayments}</span></div>
			{/if}
		</div>
		{#if loading}
			<Loader static text="Completing Loan Payment..." />
		{/if}
	</AppContainer>
{/if}

<Modal showing={viewingCredit} title="Credit Score" acceptLabel="Got It" closeLabel="Close" onAccept={() => (viewingCredit = false)} onClose={() => (viewingCredit = false)}>
	<p>
		Your Credit Score is <strong class="highlight">{bankLoans?.creditScore ?? 0}</strong>
	</p>
	<p>You can improve your credit score by paying loans on time or in advance. Missing loan payments will decrease your credit score.</p>
</Modal>

<Modal
	showing={paying}
	title={viewedLoan ? `Loan Payment - ${usd.format(nextPaymentAmount(viewedLoan, payWeeks))}` : ''}
	acceptLabel="Make Payment"
	closeLabel="Cancel"
	onAccept={confirmPayment}
	onClose={() => (paying = false)}
>
	{#if viewedLoan}
		<p>Loan payments are taken from your Personal Checking Account. Due payment: {usd.format(nextPaymentAmount(viewedLoan, payWeeks))}.</p>
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
		gap: 8px;
	}

	.loan-card {
		position: relative;
		background: var(--color-bg-panel);
		border: 1px solid var(--color-primary);
		border-radius: 14px;
		padding: 12px;
		min-height: 110px;
		text-align: left;
		cursor: pointer;
		box-shadow: var(--shadow-card);
	}

	.branding {
		font-size: 15px;
		font-weight: 700;
		color: var(--color-primary-light);
	}

	.branding small {
		display: block;
		font-size: 12px;
		font-weight: 400;
		color: var(--color-text-muted);
	}

	.status {
		position: absolute;
		top: 12px;
		right: 12px;
		padding: 3px 8px;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 700;
		background: var(--color-bg-panel-alt);
		color: var(--color-text-alt);
	}

	.status.default {
		background: var(--color-error);
		color: #fff;
	}

	.status.paid {
		background: var(--color-primary);
		color: #fff;
	}

	.type-icon {
		position: absolute;
		bottom: 12px;
		left: 14px;
		color: var(--color-text-muted);
	}

	.loan-balance {
		position: absolute;
		bottom: 12px;
		right: 14px;
		text-align: right;
	}

	/* success-light for contrast against this app's own green tint */
	.balance {
		font-size: 21px;
		font-weight: 700;
		letter-spacing: 1px;
		color: var(--color-success-light);
	}

	.loan-date {
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	.view {
		height: 100%;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 16px;
	}

	.warning {
		background: var(--color-error);
		border-radius: 10px;
		padding: 10px 12px;
		margin-bottom: 16px;
		font-size: 13px;
	}

	.warning p {
		margin: 4px 0 0;
	}

	.balance-label,
	.due-label {
		font-size: 14px;
		color: var(--color-text-alt);
	}

	.balance-value {
		font-size: 27px;
		font-weight: 700;
		color: var(--color-success-light);
		margin-bottom: 14px;
	}

	.due-value {
		font-size: 21px;
		font-weight: 700;
		color: var(--color-success-light);
		margin-bottom: 16px;
	}

	.section-header {
		text-align: center;
		font-size: 15px;
		color: var(--color-text);
		padding-bottom: 6px;
		margin-bottom: 8px;
		border-bottom: 1px solid var(--color-primary);
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		font-size: 14.5px;
		padding: 7px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		color: var(--color-text-alt);
	}

	.highlight {
		color: var(--color-info, var(--color-primary-light));
	}
</style>
