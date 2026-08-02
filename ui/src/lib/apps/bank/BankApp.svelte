<!-- Fleeca banking: accounts list, account detail, bills. Uses a plain hover state on account cards,
	 no tilt/glare effect - not worth a dependency for one decorative flourish. -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Loader from '../../primitives/Loader.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import AppInput from '../../primitives/AppInput.svelte';
	import Dropdown from '../../primitives/Dropdown.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { BankAccount, BankAccountsData, BankTransaction, PendingBill } from '../../types';

	const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
	const appColor = '#268f3a';

	const view = $derived(navState.route === 'bills' ? 'bills' : navState.route.startsWith('view/') ? 'view' : 'list');
	const targetAccount = $derived(navState.route.startsWith('view/') ? navState.route.slice('view/'.length) : '');

	let bankData = $state<BankAccountsData | null>(null);
	let loading = $state(false);
	let loaded = $state(false);

	async function load() {
		loading = true;
		const res = await Nui.bankGetData();
		if (res) bankData = res;
		loading = false;
		loaded = true;
	}

	$effect(() => {
		if (!loaded) load();
	});

	const accounts = $derived(bankData?.accounts ?? []);
	const pendingBills = $derived(bankData?.pendingBills ?? []);
	const personalAccounts = $derived(accounts.filter((a) => a.Type === 'personal'));
	const savingsAccounts = $derived(accounts.filter((a) => a.Type === 'personal_savings'));
	const orgAccounts = $derived(accounts.filter((a) => a.Type === 'organization'));

	function accountName(acc: BankAccount): string {
		if (acc.Type === 'personal') return 'Current Account';
		if (acc.Type === 'personal_savings') return 'Savings Account';
		return acc.Name ?? 'Bank Account';
	}

	function accountTypeLabel(acc: BankAccount): string {
		if (acc.Type === 'personal') return 'Current Account';
		if (acc.Type === 'personal_savings') return 'Savings Account';
		if (acc.Type === 'organization') return 'Organization Account';
		return 'Bank Account';
	}

	function maskAccount(acc: string | number): string {
		const digits = String(acc).split('').reverse();
		let visible = 0;
		return digits
			.map((c) => {
				if (!/\d/.test(c)) return c;
				if (visible < 4) {
					visible += 1;
					return c;
				}
				return 'x';
			})
			.reverse()
			.join('');
	}

	// server returns Account as a number (bank_accounts.account is numeric), route params are always
	// strings - coerce both to string or this never matches
	const viewedAccount = $derived(accounts.find((a) => String(a.Account) === targetAccount));

	// transactions (paginated)
	let transactions = $state<BankTransaction[]>([]);
	let moreTransactions = $state(false);
	let loadingTx = $state(false);

	// takes the account explicitly and always starts from offset 0 - this is the effect's own initial
	// load, so it must NOT read the live `transactions` state, or its synchronous pre-await read of
	// `transactions.length` gets tracked as an effect dependency. Since the effect also assigns
	// `transactions = []` itself, that creates a read-then-later-write cycle: every time this resolves and
	// writes `transactions`, the effect re-fires, wipes the array, and re-fetches - forever, freezing the UI.
	async function loadInitialTransactions(account: string) {
		loadingTx = true;
		const res = await Nui.bankGetTransactions(account, 0, 15);
		transactions = res.data;
		moreTransactions = res.more;
		loadingTx = false;
	}

	// only called from the "Load More" button click, never from the effect, so reading `transactions.length`
	// here is safe - it's outside any reactive tracking scope
	async function loadMoreTransactions() {
		if (!viewedAccount || loadingTx) return;
		loadingTx = true;
		const res = await Nui.bankGetTransactions(viewedAccount.Account, transactions.length, 15);
		transactions = [...transactions, ...res.data];
		moreTransactions = res.more;
		loadingTx = false;
	}

	$effect(() => {
		if (view === 'view' && viewedAccount) {
			transactions = [];
			moreTransactions = false;
			if (viewedAccount.Permissions?.TRANSACTIONS) loadInitialTransactions(viewedAccount.Account);
		}
	});

	function formatTxTime(ms: number): string {
		return new Date(ms).toLocaleDateString();
	}

	function formatBillTime(unixSeconds: number): string {
		const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return `${Math.floor(diff / 86400)}d ago`;
	}

	// transfer
	let transferring = $state(false);
	let transferTargetType = $state(false);
	let transferTarget = $state('');
	let transferAmount = $state('');
	let transferDescription = $state('');
	let submittingAction = $state(false);

	function openTransfer() {
		if (!viewedAccount?.Permissions?.WITHDRAW) return;
		if (viewedAccount.Balance <= 0) {
			pushAlert('No Balance to Transfer', 'error');
			return;
		}
		transferTargetType = false;
		transferTarget = '';
		transferAmount = '';
		transferDescription = '';
		transferring = true;
	}

	async function submitTransfer() {
		if (!viewedAccount) return;
		const amount = Math.min(Number(transferAmount) || 0, viewedAccount.Balance);
		if (!transferTarget.trim() || amount <= 0) {
			pushAlert('Invalid Transfer', 'error');
			return;
		}
		transferring = false;
		submittingAction = true;
		const ok = await Nui.bankTransfer(viewedAccount.Account, transferTargetType, transferTarget.trim(), amount, transferDescription.trim());
		submittingAction = false;
		if (ok) {
			pushAlert('Funds Transferred Successfully');
			await load();
			navigateToApp('bank');
		} else {
			pushAlert('Error Transferring Funds', 'error');
		}
	}

	// bill creation
	let billingOpen = $state(false);
	let billTarget = $state('');
	let billDescription = $state('');
	let billAmount = $state('');

	function openBilling() {
		if (!viewedAccount?.Permissions?.BILL) return;
		billTarget = '';
		billDescription = '';
		billAmount = '';
		billingOpen = true;
	}

	async function submitBill() {
		if (!viewedAccount) return;
		const amount = Number(billAmount) || 0;
		if (!billTarget.trim() || !billDescription.trim() || amount <= 0) {
			pushAlert('Invalid Bill', 'error');
			return;
		}
		billingOpen = false;
		submittingAction = true;
		const ok = await Nui.bankCreateBill(viewedAccount.Account, billTarget.trim(), billDescription.trim(), amount);
		submittingAction = false;
		if (ok) {
			pushAlert('Bill Sent Successfully');
			navigateToApp('bank');
		} else {
			pushAlert('Error Creating Bill', 'error');
		}
	}

	// bills
	let payingBill = $state<PendingBill | null>(null);
	let payWithAccount = $state('');

	function openPayBill(bill: PendingBill) {
		payWithAccount = personalAccounts[0]?.Account ?? accounts[0]?.Account ?? '';
		payingBill = bill;
	}

	async function confirmPayBill() {
		if (!payingBill) return;
		const account = accounts.find((a) => String(a.Account) === String(payWithAccount));
		if (!account || account.Balance < payingBill.Amount) {
			pushAlert('Insufficient Funds to Pay Bill', 'error');
			return;
		}
		const bill = payingBill;
		payingBill = null;
		loading = true;
		const ok = await Nui.bankAcceptBill(bill.Id, payWithAccount);
		pushAlert(ok ? 'Bill Has Been Paid' : 'Error Paying Bill', ok ? undefined : 'error');
		await load();
	}

	async function denyBill(bill: PendingBill) {
		loading = true;
		const ok = await Nui.bankDismissBill(bill.Id);
		pushAlert(ok ? 'Bill Has Been Dismissed' : 'Error Dismissing Bill', ok ? undefined : 'error');
		await load();
	}
</script>

{#if view === 'list'}
	<AppContainer appId="bank" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('bank', 'bills')} aria-label="Bills">
				{#if pendingBills.length > 0}<span class="bill-count">{pendingBills.length}</span>{/if}
				<Icon name="file-invoice" size="20px" />
			</button>
			<button class="header-action" onclick={load} disabled={loading} aria-label="Refresh"><Icon name="arrows-rotate" size="20px" /></button>
		{/snippet}
		{#if loading && !loaded}
			<Loader static text="Loading Accounts" />
		{:else if accounts.length === 0}
			<div class="empty">No Accounts</div>
		{:else}
			<div class="acc-list">
				{#each [...personalAccounts, ...savingsAccounts, ...orgAccounts] as acc (acc.Account)}
					<button class="acc-card" onclick={() => navigateToApp('bank', `view/${acc.Account}`)}>
						<div class="acc-top-row">
							<div class="acc-branding">TISA <Icon name="building-columns" size="14px" /></div>
							<div class="acc-name">{accountName(acc)}</div>
						</div>
						<div class="acc-balance">{acc.Permissions?.BALANCE ? usd.format(acc.Balance) : '???'}</div>
						<div class="acc-number">{maskAccount(acc.Account)}</div>
					</button>
				{/each}
			</div>
		{/if}
	</AppContainer>
{:else if view === 'bills'}
	<AppContainer appId="bank" title="Pending Bills" useAppColor={true}>
		{#if pendingBills.length === 0}
			<div class="empty">No Pending Bills</div>
		{:else}
			<div class="bill-list">
				{#each [...pendingBills].sort((a, b) => b.Timestamp - a.Timestamp) as bill (bill.Id)}
					<div class="bill-card">
						<div class="bill-row">
							<div class="bill-main">
								<div class="bill-amount"><span class="currency">{usd.format(bill.Amount)}</span> {bill.Name}</div>
								<div class="bill-time">Received {formatBillTime(bill.Timestamp)}</div>
							</div>
							<div class="bill-actions">
								<button class="bill-btn accept" onclick={() => openPayBill(bill)} aria-label="Accept"><Icon name="check" size="14px" /></button>
								<button class="bill-btn decline" onclick={() => denyBill(bill)} aria-label="Decline"><Icon name="xmark" size="14px" /></button>
							</div>
						</div>
						<div class="bill-desc">{bill.Description || 'Bill Has No Description'}</div>
					</div>
				{/each}
			</div>
		{/if}
	</AppContainer>
{:else if view === 'view' && viewedAccount}
	<AppContainer appId="bank" title={accountName(viewedAccount)} useAppColor={true}>
		{#snippet actions()}
			{#if viewedAccount.Permissions?.BILL}
				<button class="header-action" onclick={openBilling} disabled={submittingAction} aria-label="Send Bill"><Icon name="file-invoice-dollar" size="20px" /></button>
			{/if}
			{#if viewedAccount.Permissions?.WITHDRAW}
				<button class="header-action" onclick={openTransfer} disabled={submittingAction} aria-label="Transfer"><Icon name="money-bill-transfer" size="20px" /></button>
			{/if}
		{/snippet}
		{#if submittingAction}
			<Loader static text="Processing..." />
		{:else}
			<div class="acc-view">
				<div class="sub-bar">
					<div>Account Number: {viewedAccount.Account}</div>
					<div>Account Type: {accountTypeLabel(viewedAccount)}</div>
				</div>
				<div class="balance-bar">
					<span class="currency-large">{viewedAccount.Permissions?.BALANCE ? usd.format(viewedAccount.Balance) : '???'}</span>
				</div>
				{#if viewedAccount.Permissions?.TRANSACTIONS}
					<div class="tx-list">
						{#if transactions.length === 0 && !loadingTx}
							<div class="empty small">No Transaction History</div>
						{:else}
							{#each [...transactions].sort((a, b) => b.Timestamp - a.Timestamp) as tx, i (i)}
								<div class="tx-row">
									<span class="tx-title">{tx.Title ?? 'Unknown'}</span>
									<span class="tx-amount" class:negative={tx.Amount <= 0}>{tx.Amount > 0 ? '+' : '-'}{usd.format(Math.abs(tx.Amount))}</span>
									<span class="tx-time">{formatTxTime(tx.Timestamp)}</span>
								</div>
							{/each}
							{#if loadingTx}
								<Loader static text="Loading" />
							{:else if moreTransactions && transactions.length < 100}
								<button class="load-more" onclick={loadMoreTransactions}>Load More</button>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</AppContainer>
{/if}

<Modal showing={transferring} title="Transfer Funds" acceptLabel="Transfer" closeLabel="Cancel" onAccept={submitTransfer} onClose={() => (transferring = false)}>
	<label class="field">
		<span>Transferring From</span>
		<input disabled value={viewedAccount?.Account ?? ''} />
	</label>
	<label class="field">
		<span>Transfer Type</span>
		<Dropdown
			bind:value={transferTargetType}
			options={[
				{ value: false, label: 'Transfer By Bank Account' },
				{ value: true, label: 'Transfer By State ID' },
			]}
		/>
	</label>
	<AppInput label="Transferring To" bind:value={transferTarget} accent={appColor} maxlength={6} />
	<AppInput label={`Amount (max ${usd.format(viewedAccount?.Balance ?? 0)})`} type="number" bind:value={transferAmount} accent={appColor} />
	<label class="field">
		<span>Description (optional)</span>
		<textarea bind:value={transferDescription} rows={3} maxlength={240}></textarea>
	</label>
</Modal>

<Modal showing={billingOpen} title="Send Bill" acceptLabel="Bill" closeLabel="Cancel" onAccept={submitBill} onClose={() => (billingOpen = false)}>
	<AppInput label="Billing State ID" bind:value={billTarget} accent={appColor} maxlength={6} />
	<label class="field">
		<span>Billing Description</span>
		<textarea bind:value={billDescription} rows={3} maxlength={240}></textarea>
	</label>
	<AppInput label="Bill Amount" type="number" bind:value={billAmount} accent={appColor} />
</Modal>

<Modal
	showing={payingBill !== null}
	title={payingBill ? `Accept Bill of ${usd.format(payingBill.Amount)}` : ''}
	acceptLabel="Accept Bill"
	closeLabel="Cancel"
	onAccept={confirmPayBill}
	onClose={() => (payingBill = null)}
>
	<label class="field">
		<span>Pay With</span>
		<Dropdown
			bind:value={payWithAccount}
			options={accounts.map((acc) => ({ value: acc.Account, label: `${accountName(acc)} - ${acc.Account}`, disabled: !acc.Permissions?.WITHDRAW }))}
		/>
	</label>
</Modal>

<style>
	.header-action {
		background: none;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		padding: 6px 9px;
		position: relative;
	}

	.header-action:disabled {
		opacity: 0.4;
	}

	.bill-count {
		position: absolute;
		top: 0;
		right: 0;
		background: var(--color-error);
		color: #fff;
		font-size: 10px;
		font-weight: 700;
		border-radius: 10px;
		padding: 1px 5px;
	}

	.empty {
		text-align: center;
		margin-top: 25%;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.empty.small {
		margin-top: 10%;
		font-size: 14px;
	}

	.acc-list {
		padding: 10px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	/* normal flex flow, no absolute positioning */
	.acc-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-height: 130px;
		border-radius: 15px;
		background: var(--color-bg-panel);
		box-shadow: var(--shadow-card);
		border: 2px solid transparent;
		padding: 16px 20px;
		text-align: left;
		cursor: pointer;
		font-family: inherit;
	}

	.acc-card:hover {
		border-color: #268f3a;
	}

	.acc-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.acc-branding {
		font-style: italic;
		font-weight: 700;
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--color-text);
		flex-shrink: 0;
	}

	.acc-name {
		font-size: 12px;
		color: var(--color-text-muted);
		text-align: right;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.acc-balance {
		flex: 1;
		display: flex;
		align-items: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 22px;
		font-weight: 700;
		color: var(--color-success-light);
	}

	.acc-number {
		text-align: center;
		font-family: monospace;
		letter-spacing: 4px;
		color: var(--color-text-alt);
	}

	.bill-list {
		padding: 10px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.bill-card {
		background: var(--color-bg-panel);
		border-left: 3px solid #268f3a;
		border-radius: 10px;
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}

	.bill-row {
		display: flex;
		align-items: center;
		padding: 10px;
	}

	.bill-main {
		flex: 1;
	}

	.bill-amount {
		font-size: 15px;
		color: var(--color-text);
	}

	.currency {
		color: var(--color-success-light);
		font-weight: 700;
	}

	.bill-time {
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	.bill-actions {
		display: flex;
		gap: 4px;
	}

	.bill-btn {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.bill-btn.accept {
		background: var(--color-success);
		color: #fff;
	}

	.bill-btn.decline {
		background: var(--color-error);
		color: #fff;
	}

	.bill-desc {
		padding: 8px 10px;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		font-size: 12px;
		color: var(--color-text-alt);
	}

	.acc-view {
		height: 100%;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.sub-bar {
		background: var(--color-secondary-light);
		padding: 12px 16px;
		font-size: 13px;
		color: var(--color-text-alt);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.balance-bar {
		background: var(--color-bg-panel);
		padding: 20px 16px;
		margin: 10px;
		border-radius: 10px;
		box-shadow: var(--shadow-card);
	}

	.currency-large {
		font-size: 25px;
		font-weight: 700;
		color: var(--color-success-light);
	}

	.tx-list {
		padding: 0 16px 16px;
	}

	.tx-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		padding: 8px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.tx-title {
		font-size: 14px;
		color: var(--color-text);
		flex: 1;
	}

	/* success-light for contrast against this app's own green tint */
	.tx-amount {
		font-size: 15px;
		font-weight: 700;
		color: var(--color-success-light);
	}

	.tx-amount.negative {
		color: #ff6b6b;
	}

	.tx-time {
		width: 100%;
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.load-more {
		width: 100%;
		background: none;
		border: none;
		color: var(--color-success);
		font-size: 13px;
		font-weight: 600;
		padding: 10px;
		cursor: pointer;
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

	.field input,
	.field textarea {
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
