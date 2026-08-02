<!-- thread list, new message, conversation -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Loader from '../../primitives/Loader.svelte';
	import EmojiPicker from '../../primitives/EmojiPicker.svelte';
	import { dataState } from '../../store/data.svelte';
	import { messagesState, setThreads, clearLastReceived } from '../../store/messages.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { MessageText } from '../../types';

	const view = $derived(navState.route === 'new' ? 'new' : navState.route.startsWith('convo/') ? 'convo' : 'list');
	const convoNumber = $derived(navState.route.startsWith('convo/') ? navState.route.slice('convo/'.length) : '');

	// thread list
	let loaded = $state(false);
	$effect(() => {
		if (!loaded) {
			loaded = true;
			// thread list arrives via the SET_MESSAGE_THREADS push, not this call's resolved value
			Nui.messagesInitLoad();
		}
	});

	function contactFor(number: string) {
		return dataState.contacts.find((c) => c.number === number);
	}

	function timeAgo(unixSeconds: number): string {
		const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
		if (diff < 60) return 'now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
		return `${Math.floor(diff / 86400)}d`;
	}

	// new message
	let rawInput = $state('');
	const filteredContacts = $derived(
		[...dataState.contacts]
			.filter((c) => !rawInput || c.name.toUpperCase().includes(rawInput.toUpperCase()) || c.number.replace(/-/g, '').includes(rawInput))
			.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name)),
	);

	function formatRawNumber(raw: string): string | null {
		const digits = raw.replace(/\D/g, '');
		if (digits.length !== 10) return null;
		return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
	}

	function sendToRaw() {
		const formatted = formatRawNumber(rawInput);
		if (!formatted) {
			pushAlert('Not A Valid Number', 'error');
			return;
		}
		navigateToApp('messages', `convo/${formatted}`);
	}

	// conversation
	let texts = $state<MessageText[]>([]);
	let draft = $state('');
	let loadedConvoFor = $state('');

	$effect(() => {
		if (view === 'convo' && convoNumber && loadedConvoFor !== convoNumber) {
			loadedConvoFor = convoNumber;
			texts = [];
			Nui.messagesLoadTexts(convoNumber, 0).then((res) => {
				if (res) texts = res;
			});
			Nui.readConvo(convoNumber);
		}
	});

	$effect(() => {
		if (view === 'convo' && messagesState.lastReceived && messagesState.lastReceived.number === convoNumber) {
			const msg = messagesState.lastReceived;
			clearLastReceived();
			texts = [...texts, { id: msg.id, owner: msg.owner, number: msg.number, method: 0, unread: false, time: msg.time, message: msg.message }];
		}
	});

	async function sendMessage() {
		const message = draft.trim();
		if (!message || !dataState.player) return;
		draft = '';
		const time = Math.floor(Date.now() / 1000);
		const owner = dataState.player.Phone;
		const id = await Nui.sendMessage(owner, convoNumber, message, time);
		if (id) {
			texts = [...texts, { id, owner, number: convoNumber, method: 1, unread: false, time, message }];
			const existing = messagesState.threads.find((t) => t.number === convoNumber);
			setThreads(
				existing
					? messagesState.threads.map((t) => (t.number === convoNumber ? { ...t, time, message } : t))
					: [{ id, owner, number: convoNumber, method: 1, time, count: 1, message, unread: 0 }, ...messagesState.threads],
			);
		} else {
			pushAlert('Failed To Send Message', 'error');
		}
	}

	async function deleteConversation() {
		const ok = await Nui.deleteConvo(convoNumber);
		if (ok) {
			setThreads(messagesState.threads.filter((t) => t.number !== convoNumber));
			pushAlert('Conversation Deleted');
			navigateToApp('messages');
		} else {
			pushAlert('Failed Deleting Conversation', 'error');
		}
	}

	const convoContact = $derived(contactFor(convoNumber));
</script>

{#if view === 'list'}
	<AppContainer appId="messages" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('messages', 'new')} aria-label="New Message"><Icon name="plus" size="20px" /></button>
		{/snippet}
		{#if !loaded}
			<Loader static text="Loading Messages" />
		{:else if messagesState.threads.length === 0}
			<div class="empty">You Have No Messages</div>
		{:else}
			{#each [...messagesState.threads].sort((a, b) => b.time - a.time) as thread (thread.id)}
				{@const contact = contactFor(thread.number)}
				<button class="thread-row" class:unread={thread.unread > 0} onclick={() => navigateToApp('messages', `convo/${thread.number}`)}>
					<span class="unread-dot" class:show={thread.unread > 0}></span>
					<span class="avatar" style:background={contact?.color ?? '#333'}>{(contact?.name ?? '#').charAt(0)}</span>
					<span class="thread-main">
						<span class="thread-top">
							<span class="thread-name">{contact?.name ?? thread.number}</span>
							<span class="thread-time">{timeAgo(thread.time)}</span>
						</span>
						<span class="thread-preview">{thread.message}</span>
					</span>
				</button>
			{/each}
		{/if}
	</AppContainer>
{:else if view === 'new'}
	<AppContainer appId="messages" useAppColor={true}>
		<div class="new-search">
			<input class="search-input" placeholder="Enter Number or Contact Name" bind:value={rawInput} maxlength={32} />
			<button class="send-raw" onclick={sendToRaw} aria-label="Start conversation"><Icon name="paper-plane" size="16px" /></button>
		</div>
		{#if dataState.contacts.length === 0}
			<div class="empty error">You Have No Contacts</div>
		{:else}
			{#each filteredContacts as contact (contact.id)}
				<button class="thread-row" onclick={() => navigateToApp('messages', `convo/${contact.number}`)}>
					<span class="avatar" style:background={contact.color ?? '#333'}>{contact.name.charAt(0)}</span>
					<span class="thread-main">
						<span class="thread-name">{contact.name}</span>
						<span class="thread-preview">{contact.number}</span>
					</span>
				</button>
			{/each}
		{/if}
	</AppContainer>
{:else}
	<AppContainer appId="messages" title={convoContact?.name ?? convoNumber} colorOverride={convoContact?.color ?? undefined}>
		{#snippet actions()}
			<button class="header-action" onclick={deleteConversation} aria-label="Delete conversation"><Icon name="trash" size="20px" /></button>
		{/snippet}
		<div class="convo">
			<div class="bubbles">
				{#each [...texts].sort((a, b) => a.time - b.time) as msg, i (msg.id)}
					{@const prev = texts[i - 1]}
					{@const next = texts[i + 1]}
					{@const groupedWithPrev = prev && prev.method === msg.method}
					{@const groupedWithNext = next && next.method === msg.method}
					<div class="bubble-wrap" class:mine={msg.method === 1} style:margin-top={groupedWithPrev ? '2px' : '10px'}>
						<div class="bubble" class:mine={msg.method === 1} class:tail={!groupedWithNext}>
							{msg.message}
						</div>
					</div>
				{/each}
			</div>
			<div class="send-row">
				<EmojiPicker onPick={(emoji) => (draft += emoji)} />
				<input class="compose-input" placeholder="iMessage" bind:value={draft} maxlength={256} onkeydown={(e) => e.key === 'Enter' && sendMessage()} />
				<button class="send-btn" class:active={draft.trim().length > 0} onclick={sendMessage} disabled={!draft.trim()} aria-label="Send">
					<Icon name="arrow-up" size="14px" />
				</button>
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

	.empty {
		text-align: center;
		margin-top: 25%;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.empty.error {
		color: var(--color-error-light);
	}

	.thread-row {
		width: 100%;
		background: none;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding: 10px 14px;
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
		text-align: left;
	}

	.thread-row:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.unread-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		visibility: hidden;
	}

	.unread-dot.show {
		visibility: visible;
		background: var(--color-primary);
	}

	.avatar {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-weight: 700;
		font-size: 16px;
	}

	.thread-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: 2px;
	}

	.thread-top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}

	.thread-name {
		font-size: 15px;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.thread-row.unread .thread-name {
		font-weight: 700;
	}

	.thread-preview {
		font-size: 12.5px;
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.thread-row.unread .thread-preview {
		color: var(--color-text);
	}

	.thread-time {
		font-size: 12px;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.new-search,
	.send-row {
		display: flex;
		gap: 8px;
		padding: 12px;
	}

	.search-input {
		flex: 1;
		background: rgba(255, 255, 255, 0.06);
		border: var(--border-input);
		border-radius: 20px;
		padding: 10px 14px;
		color: var(--color-text);
		font-size: 14px;
		outline: none;
	}

	.send-raw {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		width: 40px;
	}

	.convo {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.bubbles {
		flex: 1;
		overflow-y: auto;
		padding: 10px;
		display: flex;
		flex-direction: column;
	}

	.bubble-wrap {
		display: flex;
	}

	.bubble-wrap.mine {
		justify-content: flex-end;
	}

	.bubble {
		max-width: 72%;
		padding: 9px 13px;
		border-radius: 18px;
		background: var(--color-secondary-light);
		color: var(--color-text);
		overflow-wrap: break-word;
		font-size: 14.5px;
		line-height: 1.35;
	}

	.bubble.mine {
		background: var(--color-primary);
		color: #fff;
	}

	.bubble.tail.mine {
		border-bottom-right-radius: 4px;
	}

	.bubble:not(.mine).tail {
		border-bottom-left-radius: 4px;
	}

	.send-row {
		align-items: center;
	}

	.compose-input {
		flex: 1;
		background: rgba(255, 255, 255, 0.06);
		border: var(--border-input);
		border-radius: 20px;
		padding: 9px 14px;
		color: var(--color-text);
		font-size: 14px;
		outline: none;
	}

	.send-btn {
		flex-shrink: 0;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.1);
		color: var(--color-text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: default;
		transition:
			background 150ms ease,
			color 150ms ease;
	}

	.send-btn.active {
		background: var(--color-primary);
		color: #fff;
		cursor: pointer;
	}
</style>
