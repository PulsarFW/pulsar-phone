<!-- dialer, recents, active call -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import { dataState } from '../../store/data.svelte';
	import { phoneState } from '../../store/phone.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';

	const view = $derived(navState.route.startsWith('call/') ? 'call' : navState.route === 'recent' ? 'recent' : 'dialer');
	const callNumber = $derived(navState.route.startsWith('call/') ? navState.route.slice('call/'.length) : '');

	// dialer
	let dialNumber = $state('');
	const matchedContact = $derived(dataState.contacts.find((c) => c.number.startsWith(dialNumber)));

	function formatNumber(raw: string): string {
		const digits = raw.replace(/\D/g, '').slice(0, 10);
		if (digits.length > 6) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
		if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
		return digits;
	}

	function pressKey(digit: string) {
		dialNumber = formatNumber(dialNumber.replace(/\D/g, '') + digit);
	}

	function backspace() {
		dialNumber = formatNumber(dialNumber.replace(/\D/g, '').slice(0, -1));
	}

	async function startCall() {
		if (dialNumber.length !== 12 || phoneState.call) return;
		if (dialNumber === dataState.player?.Phone) {
			pushAlert('Cannot Call Yourself', 'error');
			return;
		}
		const ok = await Nui.createCall(dialNumber);
		if (ok) navigateToApp('phone', `call/${dialNumber}`);
		else pushAlert('Unable To Start Call', 'error');
	}

	// recents
	const unreadCalls = $derived(dataState.calls.some((c) => (c as unknown as { unread?: boolean }).unread));
	$effect(() => {
		if (view === 'recent' && unreadCalls) Nui.readCalls();
	});
	let expandedCall = $state<number | null>(null);

	function timeAgo(unixSeconds?: number): string {
		if (!unixSeconds) return '';
		const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
		if (diff < 60) return 'Just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return `${Math.floor(diff / 86400)}d ago`;
	}

	// active call
	const contactForCall = $derived(dataState.contacts.find((c) => c.number === callNumber));
	const callStateLabel = $derived.by(() => {
		const call = phoneState.call;
		if (!call) return 'Call Ended';
		if (call.state === 0) return 'Calling';
		if (call.state === 1) return 'Incoming';
		const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - (call.startedAt ?? 0));
		const m = Math.floor(elapsed / 60);
		const s = elapsed % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	});

	function accept() {
		Nui.acceptCall();
	}

	function end() {
		Nui.endCall();
	}

	const KEYS = [
		{ digit: '1', letters: '' },
		{ digit: '2', letters: 'ABC' },
		{ digit: '3', letters: 'DEF' },
		{ digit: '4', letters: 'GHI' },
		{ digit: '5', letters: 'JKL' },
		{ digit: '6', letters: 'MNO' },
		{ digit: '7', letters: 'PQRS' },
		{ digit: '8', letters: 'TUV' },
		{ digit: '9', letters: 'WXYZ' },
		{ digit: '0', letters: '+' },
	];
</script>

{#if view === 'dialer'}
	<div class="dialer">
		<div class="info">
			<div class="contact-name">{matchedContact ? matchedContact.name : 'Unknown Number'}</div>
			<div class="number-row">
				<span class="number-display">{dialNumber || '___-___-____'}</span>
				{#if dialNumber}
					<button class="backspace" onclick={backspace} aria-label="Backspace"><Icon name="delete-left" size="18px" /></button>
				{/if}
			</div>
		</div>
		<div class="keys">
			{#each KEYS.slice(0, 9) as k (k.digit)}
				<button class="key" onclick={() => pressKey(k.digit)}>
					<span class="digit">{k.digit}</span>
					<span class="letters">{k.letters}</span>
				</button>
			{/each}
			<div class="key-spacer"></div>
			<button class="key" onclick={() => pressKey('0')}>
				<span class="digit">0</span>
				<span class="letters">+</span>
			</button>
			<div class="key-spacer"></div>
		</div>
		<div class="dial-actions">
			<div class="action-slot">
				<button class="round-btn nav" onclick={() => navigateToApp('contacts')} aria-label="Contacts">
					<Icon name="address-book" size="18px" />
				</button>
			</div>
			<button class="round-btn call" disabled={dialNumber.length !== 12 || Boolean(phoneState.call)} onclick={startCall} aria-label="Call">
				<Icon name="phone" size="26px" />
			</button>
			<div class="action-slot">
				<button class="round-btn nav" onclick={() => navigateToApp('phone', 'recent')} aria-label="Recents">
					<Icon name="clock-rotate-left" size="18px" />
				</button>
			</div>
		</div>
	</div>
{:else if view === 'recent'}
	<AppContainer appId="phone" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('phone')} aria-label="Dialer"><Icon name="phone" size="20px" /></button>
		{/snippet}
		{#if dataState.calls.length === 0}
			<div class="empty">You Have No Recent Calls</div>
		{:else}
			{#each [...dataState.calls].sort((a, b) => (b.time ?? 0) - (a.time ?? 0)) as call, i (call.id)}
				{@const contact = dataState.contacts.find((c) => c.number === call.number)}
				<button class="call-row" onclick={() => (expandedCall = expandedCall === i ? null : i)}>
					<span class="call-icon" class:missed={call.duration < 0} style:color={call.method === 1 ? 'var(--color-info)' : 'var(--color-success)'}>
						<Icon name={call.method === 1 ? 'phone-arrow-up-right' : 'phone-arrow-down-left'} size="16px" />
					</span>
					<span class="call-main">
						<span class="call-name">{contact?.name ?? call.number}</span>
						<span class="call-time">{timeAgo(call.time)}</span>
					</span>
					{#if expandedCall === i}
						<span class="call-detail">{call.duration >= 0 ? `${call.duration}s` : 'Missed'}</span>
					{/if}
				</button>
			{/each}
		{/if}
	</AppContainer>
{:else}
	<div class="call-screen">
		<div class="caller">
			<div class="avatar" style:background={contactForCall?.color ?? '#333'}>
				{contactForCall ? contactForCall.name.charAt(0) : '#'}
			</div>
			<div class="caller-name">{contactForCall ? contactForCall.name : 'Unknown Number'}</div>
			<div class="caller-number">{callNumber}</div>
			<div class="call-status">{callStateLabel}</div>
		</div>
		<div class="spacer"></div>
		<div class="call-actions">
			{#if phoneState.call?.state === 1}
				<button class="call-btn accept" onclick={accept} aria-label="Accept"><Icon name="phone" size="28px" /></button>
			{/if}
			<button class="call-btn end" onclick={end} disabled={!phoneState.call} aria-label="End"><Icon name="phone-slash" size="28px" /></button>
		</div>
	</div>
{/if}

<style>
	/* solid background instead of floating transparently over the wallpaper - dialer/call screens skip
	   AppContainer's title header (an iOS-style dialer doesn't have one), so they need their own fill */
	.dialer {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-evenly;
		padding: 18px 14px 24px;
		background: var(--color-bg-panel);
	}

	.info {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.contact-name {
		font-size: 15px;
		font-weight: 700;
		color: var(--color-primary-light);
		max-width: 90%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.number-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 4px;
		min-height: 34px;
	}

	.number-display {
		font-size: 28px;
		font-weight: 300;
		color: var(--color-text);
		letter-spacing: 0.02em;
		text-align: center;
	}

	.backspace {
		background: none;
		border: none;
		color: var(--color-text-alt);
		cursor: pointer;
	}

	.keys {
		width: 100%;
		max-width: 260px;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		justify-items: center;
		row-gap: 10px;
	}

	.key {
		width: 68px;
		height: 68px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		border: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 100ms ease;
	}

	.key:active {
		background: rgba(255, 255, 255, 0.18);
	}

	.digit {
		font-size: 26px;
		font-weight: 500;
		color: var(--color-text);
		line-height: 1;
	}

	.letters {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.12em;
		color: var(--color-text-muted);
		margin-top: 2px;
		height: 10px;
	}

	.key-spacer {
		width: 68px;
		height: 68px;
	}

	.dial-actions {
		width: 100%;
		max-width: 260px;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		justify-items: center;
		align-items: center;
	}

	.action-slot {
		display: flex;
		justify-content: center;
	}

	.round-btn {
		border: none;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.round-btn.nav {
		width: 46px;
		height: 46px;
		background: rgba(255, 255, 255, 0.08);
		color: var(--color-text-alt);
	}

	.round-btn.call {
		width: 68px;
		height: 68px;
		background: var(--color-success);
		color: #fff;
	}

	.round-btn.call:disabled {
		background: rgba(82, 152, 74, 0.35);
		cursor: default;
	}

	.empty {
		text-align: center;
		margin-top: 30%;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.header-action {
		background: none;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		padding: 6px 9px;
	}

	.call-row {
		width: calc(100% - 12px);
		background: var(--color-bg-panel);
		box-shadow: var(--shadow-card);
		border: none;
		border-radius: var(--radius);
		margin: 4px 6px;
		padding: 10px 12px;
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
		text-align: left;
	}

	.call-row:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.call-main {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.call-name {
		font-size: 15px;
		color: var(--color-text);
	}

	.call-time {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.call-detail {
		font-size: 12px;
		color: var(--color-text-alt);
	}

	.call-screen {
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 16px;
		background: var(--color-bg-panel);
	}

	.caller {
		margin-top: 32px;
		text-align: center;
	}

	.avatar {
		height: 100px;
		width: 100px;
		border-radius: 50%;
		margin: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 48px;
		font-weight: 700;
		color: #fff;
	}

	.caller-name {
		font-size: 24px;
		font-weight: 700;
		color: var(--color-text);
		margin-top: 14px;
	}

	.caller-number {
		font-size: 16px;
		color: var(--color-text-alt);
	}

	.call-status {
		margin-top: 6px;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-success);
	}

	.spacer {
		flex: 1;
	}

	.call-actions {
		display: flex;
		justify-content: center;
		gap: 30px;
		padding-bottom: 20px;
	}

	.call-btn {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.call-btn.accept {
		background: var(--color-success);
		color: #fff;
	}

	.call-btn.end {
		background: var(--color-error);
		color: #fff;
	}

	.call-btn:disabled {
		opacity: 0.5;
	}
</style>
