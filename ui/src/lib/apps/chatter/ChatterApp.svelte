<!-- Chatter (group chat): channel list, invites, join, config. Group icon is an arbitrary image URL
	 (not a FontAwesome name like other apps) - shown as a small circular image, falls back to a plain
	 colored initial when unset/broken. -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import Confirm from '../../primitives/Confirm.svelte';
	import { dataState } from '../../store/data.svelte';
	import { chatterState, addLocalGroup, removeLocalGroup, removeLocalInvite } from '../../store/chatter.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { ChatterMessage } from '../../types';

	const view = $derived.by(() => {
		if (navState.route === 'invites') return 'invites';
		if (navState.route.startsWith('channel/')) return 'channel';
		if (navState.route.startsWith('join/')) return 'join';
		if (navState.route.startsWith('config/')) return 'config';
		return 'list';
	});
	const targetId = $derived(
		view === 'channel' || view === 'join' || view === 'config' ? Number(navState.route.slice(navState.route.indexOf('/') + 1)) : null,
	);

	const mySid = $derived(dataState.player?.SID);
	const sortedGroups = $derived([...chatterState.groups].sort((a, b) => (b.last_message ?? b.joined_date ?? 0) - (a.last_message ?? a.joined_date ?? 0)));
	const viewedGroup = $derived(chatterState.groups.find((g) => g.id === targetId));
	const viewedInvite = $derived(chatterState.invites.find((i) => i.group === targetId));

	// redirect away the moment this group vanishes from state (deleted / left)
	$effect(() => {
		if ((view === 'channel' || view === 'config') && targetId !== null && !viewedGroup) navigateToApp('chatter');
	});

	function timeAgo(unixSeconds: number | null | undefined): string {
		if (!unixSeconds) return 'Never';
		const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
		if (diff < 60) return 'Just Now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m Ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h Ago`;
		return `${Math.floor(diff / 86400)}d Ago`;
	}

	function initial(label: string): string {
		return label.charAt(0).toUpperCase() || '#';
	}

	// create group
	let creating = $state(false);
	let newLabel = $state('');
	async function submitCreate() {
		if (!newLabel.trim() || mySid === undefined) return;
		const res = await Nui.chatterCreateGroup(newLabel.trim());
		if (res) {
			addLocalGroup({ id: res.id, label: newLabel.trim(), icon: null, owner: mySid, joined_date: res.create_date, last_message: null });
			pushAlert('Group Created');
			creating = false;
			newLabel = '';
		} else {
			pushAlert('Failed Creating Group', 'error');
		}
	}

	// channel: message count + pagination
	let messages = $state<ChatterMessage[]>([]);
	let loadedChannelFor = $state<number | null>(null);
	let hasMore = $state(false);
	let loadingMessages = $state(false);
	let draft = $state('');
	let lastIncomingLen = $state(0);

	async function loadInitialMessages(channel: number) {
		loadingMessages = true;
		const count = await Nui.chatterGetMessageCount(channel);
		if (count) {
			const res = await Nui.chatterLoadMessages(channel, 0);
			if (res) {
				messages = [...res].reverse();
				hasMore = res.length < count;
			}
		}
		loadingMessages = false;
	}

	async function loadOlderMessages() {
		if (!viewedGroup || loadingMessages || !hasMore) return;
		loadingMessages = true;
		const res = await Nui.chatterLoadMessages(viewedGroup.id, messages.length);
		if (res && res.length > 0) {
			messages = [...[...res].reverse(), ...messages];
		} else {
			hasMore = false;
		}
		loadingMessages = false;
	}

	$effect(() => {
		if (view === 'channel' && targetId !== null && loadedChannelFor !== targetId) {
			loadedChannelFor = targetId;
			messages = [];
			hasMore = false;
			loadInitialMessages(targetId);
		}
	});

	// live-pushed messages, local-appended as they arrive
	$effect(() => {
		if (chatterState.incoming.length > lastIncomingLen) {
			const newOnes = chatterState.incoming.slice(lastIncomingLen);
			lastIncomingLen = chatterState.incoming.length;
			const mine = newOnes.filter((m) => m.group === targetId);
			if (view === 'channel' && mine.length > 0) messages = [...messages, ...mine.map((m) => ({ ...m, id: Date.now() + Math.random() }))];
		}
	});

	let sending = $state(false);
	async function sendMessage() {
		const text = draft.trim();
		if (!text || !viewedGroup || sending) return;
		sending = true;
		draft = '';
		const ok = await Nui.chatterSendMessage(viewedGroup.id, text);
		if (ok && mySid !== undefined) {
			messages = [...messages, { id: Date.now(), message: text, author: mySid, timestamp: Math.floor(Date.now() / 1000), group: viewedGroup.id }];
		} else {
			pushAlert('Failed Sending Message', 'error');
		}
		sending = false;
	}

	// invite
	let inviting = $state(false);
	let inviteSid = $state('');
	async function submitInvite() {
		if (!viewedGroup || !inviteSid.trim()) return;
		const ok = await Nui.chatterInviteSend(viewedGroup.id, Number(inviteSid.trim()));
		pushAlert(ok ? 'Group Invite Sent' : 'Failed Sending Group Invite', ok ? 'info' : 'error');
		inviting = false;
		inviteSid = '';
	}

	// owner menu / leave / delete
	let ownerMenuOpen = $state(false);
	let confirmingDelete = $state(false);
	let confirmingLeave = $state(false);

	async function confirmDelete() {
		confirmingDelete = false;
		if (!viewedGroup) return;
		const res = await Nui.chatterDeleteGroup(viewedGroup.id);
		if (res) {
			removeLocalGroup(viewedGroup.id);
			pushAlert('Group Deleted');
			navigateToApp('chatter');
		} else {
			pushAlert('Failed Deleting Group', 'error');
		}
	}

	async function confirmLeave() {
		confirmingLeave = false;
		if (!viewedGroup) return;
		const res = await Nui.chatterLeaveGroup(viewedGroup.id);
		if (res) {
			removeLocalGroup(viewedGroup.id);
			navigateToApp('chatter');
		}
	}

	// join / decline invite
	async function acceptInvite() {
		if (targetId === null) return;
		const group = await Nui.chatterInviteAccept(targetId);
		if (group) {
			addLocalGroup(group);
			removeLocalInvite(targetId);
			navigateToApp('chatter', `channel/${group.id}`);
		} else {
			pushAlert('Failed Accepting Invite', 'error');
		}
	}

	async function declineInvite() {
		if (targetId === null) return;
		const ok = await Nui.chatterInviteDecline(targetId);
		if (ok) {
			removeLocalInvite(targetId);
			navigateToApp('chatter', 'invites');
		}
	}

	// config (owner-only group settings)
	let configLabel = $state('');
	let configIcon = $state('');
	$effect(() => {
		if (view === 'config' && viewedGroup) {
			configLabel = viewedGroup.label;
			configIcon = viewedGroup.icon ?? '';
		}
	});
	const configDirty = $derived(Boolean(viewedGroup) && (configLabel !== viewedGroup?.label || configIcon !== (viewedGroup?.icon ?? '')));

	async function saveConfig() {
		if (!viewedGroup || !configLabel.trim()) return;
		const ok = await Nui.chatterUpdateGroup(viewedGroup.id, { label: configLabel.trim(), icon: configIcon.trim() || null });
		if (ok) {
			pushAlert('Group Updated');
			navigateToApp('chatter', `channel/${viewedGroup.id}`);
		} else {
			pushAlert('Failed Updating Group', 'error');
		}
	}
</script>

{#if view === 'list'}
	<AppContainer appId="chatter" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('chatter', 'invites')} aria-label="Invites">
				<Icon name="envelope" size="20px" />
				{#if chatterState.invites.length > 0}<span class="badge">{chatterState.invites.length}</span>{/if}
			</button>
			<button class="header-action" onclick={() => (creating = true)} aria-label="Create Group"><Icon name="plus" size="20px" /></button>
		{/snippet}
		{#if sortedGroups.length === 0}
			<div class="empty">No Groups Yet</div>
		{:else}
			<div class="group-list">
				{#each sortedGroups as group (group.id)}
					<button class="group-row" onclick={() => navigateToApp('chatter', `channel/${group.id}`)}>
						{#if group.icon}
							<img class="group-avatar" src={group.icon} alt={group.label} />
						{:else}
							<span class="group-avatar placeholder">{initial(group.label)}</span>
						{/if}
						<span class="group-main">
							<span class="group-name">{group.label}</span>
							<span class="group-sub">Last Message: {timeAgo(group.last_message)}</span>
						</span>
					</button>
				{/each}
			</div>
		{/if}
	</AppContainer>
{:else if view === 'invites'}
	<AppContainer appId="chatter" title="Invites" useAppColor={true}>
		{#if chatterState.invites.length === 0}
			<div class="empty">No Pending Invites</div>
		{:else}
			<div class="group-list">
				{#each chatterState.invites as invite (invite.group)}
					<button class="group-row" onclick={() => navigateToApp('chatter', `join/${invite.group}`)}>
						{#if invite.icon}
							<img class="group-avatar" src={invite.icon} alt={invite.label} />
						{:else}
							<span class="group-avatar placeholder">{initial(invite.label)}</span>
						{/if}
						<span class="group-main">
							<span class="group-name">{invite.label}</span>
							<span class="group-sub">Received: {timeAgo(invite.timestamp)}</span>
						</span>
					</button>
				{/each}
			</div>
		{/if}
	</AppContainer>
{:else if view === 'join'}
	<AppContainer appId="chatter" title="Group Invite" useAppColor={true}>
		<div class="join-screen">
			{#if viewedInvite}
				{#if viewedInvite.icon}
					<img class="join-avatar" src={viewedInvite.icon} alt={viewedInvite.label} />
				{:else}
					<span class="join-avatar placeholder">{initial(viewedInvite.label)}</span>
				{/if}
				<div class="join-caption">You've Been Invited To</div>
				<div class="join-label">{viewedInvite.label}</div>
				<div class="join-actions">
					<button class="join-btn decline" onclick={declineInvite} aria-label="Decline"><Icon name="xmark" size="22px" /></button>
					<button class="join-btn accept" onclick={acceptInvite} aria-label="Accept"><Icon name="check" size="22px" /></button>
				</div>
			{:else}
				<div class="empty">Invite No Longer Available</div>
			{/if}
		</div>
	</AppContainer>
{:else if view === 'channel' && viewedGroup}
	<AppContainer appId="chatter" title={viewedGroup.label} useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => (inviting = true)} aria-label="Invite"><Icon name="plus" size="20px" /></button>
			{#if mySid === viewedGroup.owner}
				<button class="header-action" onclick={() => (ownerMenuOpen = !ownerMenuOpen)} aria-label="Group Menu"><Icon name="ellipsis-vertical" size="20px" /></button>
			{:else}
				<button class="header-action" onclick={() => (confirmingLeave = true)} aria-label="Leave Group"><Icon name="arrow-right-from-bracket" size="20px" /></button>
			{/if}
		{/snippet}
		{#if ownerMenuOpen}
			<div class="owner-menu">
				<button
					onclick={() => {
						ownerMenuOpen = false;
						navigateToApp('chatter', `config/${viewedGroup.id}`);
					}}>Group Settings</button
				>
				<button
					class="danger"
					onclick={() => {
						ownerMenuOpen = false;
						confirmingDelete = true;
					}}>Delete Group</button
				>
			</div>
		{/if}
		<div class="convo">
			<div class="bubbles">
				{#if hasMore}
					<button class="load-older" onclick={loadOlderMessages} disabled={loadingMessages}>{loadingMessages ? 'Loading…' : 'Load Older Messages'}</button>
				{/if}
				{#each messages as msg, i (msg.id)}
					{@const prev = messages[i - 1]}
					{@const next = messages[i + 1]}
					{@const mine = msg.author === mySid}
					{@const groupedWithPrev = prev && prev.author === msg.author}
					{@const groupedWithNext = next && next.author === msg.author}
					<div class="bubble-wrap" class:mine style:margin-top={groupedWithPrev ? '2px' : '10px'}>
						<div class="bubble" class:mine class:tail={!groupedWithNext}>
							{msg.message}
						</div>
					</div>
				{:else}
					<div class="empty">No Messages Yet</div>
				{/each}
			</div>
			<div class="send-row">
				<input class="compose-input" placeholder="Message" bind:value={draft} maxlength={256} onkeydown={(e) => e.key === 'Enter' && sendMessage()} />
				<button class="send-btn" class:active={draft.trim().length > 0} onclick={sendMessage} disabled={!draft.trim() || sending} aria-label="Send">
					<Icon name="arrow-up" size="14px" />
				</button>
			</div>
		</div>
	</AppContainer>
{:else if view === 'config' && viewedGroup}
	<AppContainer appId="chatter" title="Group Settings" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('chatter', `channel/${viewedGroup.id}`)} aria-label="Cancel"><Icon name="xmark" size="20px" /></button>
			<button class="header-action" onclick={saveConfig} disabled={!configDirty || !configLabel.trim()} aria-label="Save"><Icon name="floppy-disk" size="20px" /></button>
		{/snippet}
		<div class="config-form">
			{#if configIcon}
				<img class="join-avatar" src={configIcon} alt={configLabel} />
			{:else}
				<span class="join-avatar placeholder">{initial(configLabel)}</span>
			{/if}
			<label class="field">
				<span>Group Label</span>
				<input bind:value={configLabel} maxlength={32} />
			</label>
			<label class="field">
				<span>Icon Link</span>
				<input bind:value={configIcon} placeholder="https://..." maxlength={256} />
			</label>
		</div>
	</AppContainer>
{/if}

<Modal showing={creating} title="New Group" acceptLabel="Create" onAccept={submitCreate} onClose={() => (creating = false)}>
	<label class="field">
		<span>Group Name</span>
		<input bind:value={newLabel} maxlength={32} />
	</label>
</Modal>

<Modal showing={inviting} title="Invite Player" acceptLabel="Send" onAccept={submitInvite} onClose={() => (inviting = false)}>
	<label class="field">
		<span>Target State ID</span>
		<input type="text" inputmode="numeric" bind:value={inviteSid} />
	</label>
</Modal>

<Confirm showing={confirmingDelete} title="Delete This Group?" description="This cannot be undone." onAccept={confirmDelete} onDeny={() => (confirmingDelete = false)} />

<Confirm showing={confirmingLeave} title="Leave This Group?" onAccept={confirmLeave} onDeny={() => (confirmingLeave = false)} />

<style>
	.header-action {
		position: relative;
		background: none;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		padding: 6px 9px;
	}

	.header-action:disabled {
		opacity: 0.4;
	}

	.badge {
		position: absolute;
		top: -2px;
		right: 0px;
		background: var(--color-error);
		color: #fff;
		font-size: 9px;
		font-weight: 700;
		min-width: 14px;
		height: 14px;
		border-radius: 7px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 3px;
	}

	.empty {
		text-align: center;
		margin-top: 25%;
		font-size: 16px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.group-list {
		display: flex;
		flex-direction: column;
	}

	.group-row {
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

	.group-row:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.group-avatar {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		object-fit: cover;
	}

	.group-avatar.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-primary);
		color: #fff;
		font-weight: 700;
		font-size: 16px;
	}

	.group-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: 2px;
	}

	.group-name {
		font-size: 15px;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.group-sub {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.owner-menu {
		position: absolute;
		top: 4px;
		right: 8px;
		z-index: 50;
		background: var(--color-bg-panel);
		border: var(--border-subtle);
		border-radius: var(--radius);
		box-shadow: var(--shadow-card);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-width: 150px;
	}

	.owner-menu button {
		background: none;
		border: none;
		text-align: left;
		padding: 10px 14px;
		font-size: 13px;
		color: var(--color-text);
		cursor: pointer;
	}

	.owner-menu button:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.owner-menu button.danger {
		color: var(--color-error-light, var(--color-error));
	}

	.join-screen {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 20px;
	}

	.join-avatar {
		width: 84px;
		height: 84px;
		border-radius: 50%;
		object-fit: cover;
	}

	.join-avatar.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-primary);
		color: #fff;
		font-weight: 700;
		font-size: 30px;
	}

	.join-caption {
		font-size: 13px;
		color: var(--color-text-muted);
		margin-top: 6px;
	}

	.join-label {
		font-size: 20px;
		font-weight: 700;
		color: var(--color-text);
		text-align: center;
	}

	.join-actions {
		display: flex;
		gap: 24px;
		margin-top: 18px;
	}

	.join-btn {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
	}

	.join-btn.decline {
		background: var(--color-error);
	}

	.join-btn.accept {
		background: var(--color-success);
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

	.load-older {
		align-self: center;
		background: rgba(255, 255, 255, 0.08);
		border: none;
		border-radius: 12px;
		color: var(--color-text-alt);
		font-size: 12px;
		padding: 6px 12px;
		cursor: pointer;
		margin-bottom: 10px;
	}

	.load-older:disabled {
		opacity: 0.5;
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
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px;
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

	.config-form {
		padding: 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
	}

	.field {
		width: 100%;
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
		outline: none;
	}
</style>
