<!-- DigiDollar: coin list, buy/sell, wallet info, transfer -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Loader from '../../primitives/Loader.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import Dropdown from '../../primitives/Dropdown.svelte';
	import { dataState, updatePlayerCrypto } from '../../store/data.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { CryptoCoin } from '../../types';

	const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

	let coins = $state<CryptoCoin[]>([]);
	let loaded = $state(false);
	let loading = $state(false);

	async function load() {
		loading = true;
		const res = await Nui.cryptoGetCoins();
		if (res) coins = res;
		loading = false;
		loaded = true;
	}

	$effect(() => {
		if (!loaded) load();
	});

	function ownedOf(short: string): number {
		return dataState.player?.Crypto?.[short] ?? 0;
	}

	const portfolioValue = $derived.by(() => {
		let total = 0;
		for (const coin of coins) {
			const owned = ownedOf(coin.Short);
			if (!owned) continue;
			const unitPrice = coin.Sellable === false ? coin.Price : coin.Sellable;
			total += owned * unitPrice;
		}
		return total;
	});

	const visibleCoins = $derived(coins.filter((c) => c.Buyable || ownedOf(c.Short) > 0));

	// wallet
	let showingWallet = $state(false);
	async function copyWallet() {
		if (!dataState.player?.CryptoWallet) return;
		try {
			await navigator.clipboard.writeText(dataState.player.CryptoWallet);
			pushAlert('Wallet Address Copied');
		} catch {
			pushAlert('Failed To Copy Address', 'error');
		}
	}

	// buy
	let buying = $state<{ coin: CryptoCoin; quantity: number } | null>(null);
	async function confirmBuy() {
		if (!buying) return;
		const { coin, quantity } = buying;
		buying = null;
		const ok = await Nui.cryptoBuy(coin.Short, quantity);
		if (ok) {
			updatePlayerCrypto(coin.Short, ownedOf(coin.Short) + quantity);
			pushAlert(`Purchased $${coin.Short}`);
		} else {
			pushAlert(`Unable To Buy $${coin.Short}`, 'error');
		}
	}

	// sell
	let selling = $state<{ coin: CryptoCoin; quantity: number } | null>(null);
	async function confirmSell() {
		if (!selling) return;
		const { coin, quantity } = selling;
		selling = null;
		const ok = await Nui.cryptoSell(coin.Short, quantity);
		if (ok) {
			updatePlayerCrypto(coin.Short, Math.max(0, ownedOf(coin.Short) - quantity));
			pushAlert(`Sold ${quantity} $${coin.Short}`);
		} else {
			pushAlert(`Unable To Sell $${coin.Short}`, 'error');
		}
	}

	// transfer
	let sending = $state(false);
	let transferShort = $state('');
	let transferTarget = $state('');
	let transferQuantity = $state(1);
	const ownedCoins = $derived(coins.filter((c) => ownedOf(c.Short) > 0));

	function openTransfer() {
		transferShort = ownedCoins[0]?.Short ?? '';
		transferTarget = '';
		transferQuantity = 1;
		sending = true;
	}

	async function confirmTransfer() {
		const coin = coins.find((c) => c.Short === transferShort);
		if (!coin || !transferTarget.trim() || transferQuantity < 1) {
			pushAlert('Invalid Transfer', 'error');
			return;
		}
		sending = false;
		const ok = await Nui.cryptoTransfer(coin.Short, transferQuantity, transferTarget.trim());
		if (ok) {
			updatePlayerCrypto(coin.Short, Math.max(0, ownedOf(coin.Short) - transferQuantity));
			pushAlert(`Sent ${transferQuantity} ${coin.Short}`);
		} else {
			pushAlert(`Unable To Transfer ${coin.Short}`, 'error');
		}
	}
</script>

<AppContainer appId="crypto" useAppColor={true}>
	{#snippet actions()}
		<button class="header-action" onclick={() => (showingWallet = true)} aria-label="Wallet Info"><Icon name="wallet" size="20px" /></button>
		<button class="header-action" onclick={openTransfer} aria-label="Transfer Crypto" disabled={ownedCoins.length === 0}>
			<Icon name="arrow-up-from-bracket" size="20px" />
		</button>
		<button class="header-action" onclick={load} aria-label="Refresh"><Icon name="arrows-rotate" size="20px" /></button>
	{/snippet}

	{#if loading && !loaded}
		<Loader static text="Loading Coins" />
	{:else}
		<div class="balance">
			<div class="balance-label">Balance</div>
			<div class="balance-value">{usd.format(portfolioValue)}</div>
		</div>

		<div class="coins">
			{#each visibleCoins as coin (coin.Short)}
				{@const owned = ownedOf(coin.Short)}
				<div class="coin-row">
					<span class="coin-icon"><Icon name="coins" size="20px" /></span>
					<div class="coin-info">
						<div class="coin-name">{coin.Name}</div>
						<div class="coin-short">${coin.Short}{#if owned}<small> - Balance: {owned}</small>{/if}</div>
					</div>
					<div class="coin-actions">
						{#if coin.Sellable !== false && owned > 0}
							<button
								class="coin-btn sell"
								onclick={() => (selling = { coin, quantity: Math.min(1, owned) })}
								aria-label={`Sell ${coin.Short}`}
							>
								<Icon name="dollar-sign" size="14px" />
							</button>
						{/if}
						{#if coin.Buyable}
							<button class="coin-btn buy" onclick={() => (buying = { coin, quantity: 1 })} aria-label={`Buy ${coin.Short}`}>
								<Icon name="cart-shopping" size="14px" />
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</AppContainer>

<Modal showing={showingWallet} title="Your Wallet Information" acceptLabel="Copy" closeLabel="Close" onAccept={copyWallet} onClose={() => (showingWallet = false)}>
	<p>Wallet Address: <span class="wallet-address">{dataState.player?.CryptoWallet ?? 'N/A'}</span></p>
</Modal>

<Modal
	showing={buying !== null}
	title={buying ? `Buy $${buying.coin.Short}` : ''}
	acceptLabel={buying ? `Buy $${buying.coin.Short}` : 'Buy'}
	closeLabel="Cancel"
	onAccept={confirmBuy}
	onClose={() => (buying = null)}
>
	{#if buying}
		<label class="field">
			<span>Quantity</span>
			<input type="number" min="1" bind:value={buying.quantity} />
		</label>
		<div class="total-row">You Will Pay: <strong>{usd.format(buying.coin.Price * buying.quantity)}</strong></div>
	{/if}
</Modal>

<Modal
	showing={selling !== null}
	title={selling ? `Sell $${selling.coin.Short}` : ''}
	acceptLabel="Sell"
	closeLabel="Cancel"
	onAccept={confirmSell}
	onClose={() => (selling = null)}
>
	{#if selling}
		{@const unitPrice = selling.coin.Sellable === false ? selling.coin.Price : selling.coin.Sellable}
		<label class="field">
			<span>Quantity (max {ownedOf(selling.coin.Short)})</span>
			<input type="number" min="1" max={ownedOf(selling.coin.Short)} bind:value={selling.quantity} />
		</label>
		<div class="total-row">You Will Receive: <strong>{usd.format(unitPrice * selling.quantity)}</strong></div>
	{/if}
</Modal>

<Modal showing={sending} title="Send Crypto" acceptLabel="Send" closeLabel="Cancel" onAccept={confirmTransfer} onClose={() => (sending = false)}>
	<label class="field">
		<span>Coin</span>
		<Dropdown bind:value={transferShort} options={ownedCoins.map((coin) => ({ value: coin.Short, label: coin.Name }))} />
	</label>
	<label class="field">
		<span>Target Wallet ID</span>
		<input bind:value={transferTarget} />
	</label>
	<label class="field">
		<span>Quantity</span>
		<input type="number" min="1" bind:value={transferQuantity} />
	</label>
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
		opacity: 0.35;
		cursor: default;
	}

	.balance {
		text-align: center;
		padding: 16px 10px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.balance-label {
		font-size: 13px;
		color: var(--color-text-muted);
	}

	/* success-light for contrast against this app's own green tint */
	.balance-value {
		font-size: 29px;
		font-weight: 700;
		color: var(--color-success-light);
	}

	.coins {
		padding: 10px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.coin-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		background: var(--color-bg-panel);
		border-radius: 12px;
		box-shadow: var(--shadow-card);
	}

	.coin-icon {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.06);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-primary-light);
		flex-shrink: 0;
	}

	.coin-info {
		flex: 1;
		min-width: 0;
	}

	.coin-name {
		font-size: 16px;
		font-weight: 700;
		color: var(--color-text);
	}

	.coin-short {
		font-size: 13.5px;
		color: var(--color-text-muted);
	}

	.coin-actions {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
	}

	.coin-btn {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: #fff;
	}

	.coin-btn.sell {
		background: var(--color-error);
	}

	.coin-btn.buy {
		background: var(--color-success);
	}

	.wallet-address {
		color: var(--color-success-light);
		word-break: break-all;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
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

	.total-row {
		font-size: 14px;
		color: var(--color-text-alt);
	}
</style>
