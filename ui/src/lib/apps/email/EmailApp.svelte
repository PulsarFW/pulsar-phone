<!-- inbox list + email detail -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import { dataState } from '../../store/data.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';

	const view = $derived(navState.route.startsWith('view/') ? 'view' : 'list');
	const targetId = $derived(navState.route.startsWith('view/') ? Number(navState.route.slice('view/'.length)) : null);

	const nowSeconds = Math.floor(Date.now() / 1000);
	const inboxEmails = $derived(
		[...dataState.emails].filter((e) => !e.expires || e.expires > nowSeconds).sort((a, b) => b.time - a.time),
	);

	function timeAgo(unixSeconds: number): string {
		const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
		if (diff < 60) return 'now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
		return `${Math.floor(diff / 86400)}d`;
	}

	function timeUntil(unixSeconds: number): string {
		const diff = Math.max(0, unixSeconds - Math.floor(Date.now() / 1000));
		if (diff < 60) return 'less than a minute';
		if (diff < 3600) return `${Math.floor(diff / 60)}m`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
		return `${Math.floor(diff / 86400)}d`;
	}

	const viewedEmail = $derived(dataState.emails.find((e) => e.id === targetId));
	const appColor = $derived(dataState.appRegistry['email']?.color ?? '#10909c');

	$effect(() => {
		if (view === 'view' && viewedEmail?.unread) {
			Nui.readEmail(viewedEmail.id);
			dataState.emails = dataState.emails.map((e) => (e.id === viewedEmail.id ? { ...e, unread: false } : e));
		}
	});

	async function deleteEmail() {
		if (!viewedEmail) return;
		const id = viewedEmail.id;
		const ok = await Nui.deleteEmail(id);
		if (ok) {
			dataState.emails = dataState.emails.filter((e) => e.id !== id);
			pushAlert('Email Deleted');
			navigateToApp('email');
		} else {
			pushAlert('Failed Deleting Email', 'error');
		}
	}

	function gpsClick() {
		const location = viewedEmail?.flags?.location as { x: number; y: number; z: number } | undefined;
		if (location) Nui.gpsRoute(location);
	}

	function linkClick() {
		const hyperlink = viewedEmail?.flags?.hyperlink as { event: string; data: unknown } | undefined;
		if (hyperlink && viewedEmail) Nui.hyperlink(hyperlink, viewedEmail.id);
	}
</script>

{#if view === 'list'}
	<AppContainer appId="email" useAppColor={true}>
		{#if inboxEmails.length === 0}
			<div class="empty">You Have No Emails</div>
		{:else}
			{#each inboxEmails as email (email.id)}
				<button class="email-row" onclick={() => navigateToApp('email', `view/${email.id}`)}>
					<span class="row-icon" class:unread={email.unread}><Icon name="envelope" size="16px" /></span>
					<span class="row-main">
						<span class="row-sender">{email.sender}</span>
						<span class="row-subject">{email.subject}</span>
					</span>
					<span class="row-time">{timeAgo(email.time)}</span>
				</button>
			{/each}
		{/if}
	</AppContainer>
{:else if viewedEmail}
	<AppContainer appId="email" title={viewedEmail.subject || 'No Email Subject'} useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={deleteEmail} aria-label="Delete Email"><Icon name="trash" size="20px" /></button>
		{/snippet}
		<div class="email-detail">
			<div class="sender-card">
				<span class="sender-avatar" style:background={appColor}>{viewedEmail.sender.charAt(0).toUpperCase()}</span>
				<div class="sender-info">
					<span class="sender-name">{viewedEmail.sender}</span>
					<span class="timestamp">{new Date(viewedEmail.time * 1000).toLocaleString()}</span>
				</div>
			</div>

			{#if viewedEmail.expires && viewedEmail.expires > nowSeconds}
				<div class="expire-pill"><Icon name="clock" size="11px" /> Expires in {timeUntil(viewedEmail.expires)}</div>
			{/if}

			<div class="subject">{viewedEmail.subject || 'No Email Subject'}</div>

			<div class="body-card">{viewedEmail.body}</div>

			{#if viewedEmail.flags?.location || viewedEmail.flags?.hyperlink}
				<div class="attachments">
					{#if viewedEmail.flags?.location}
						<button class="attach-btn" onclick={gpsClick}><Icon name="location-crosshairs" size="14px" /> View Location</button>
					{/if}
					{#if viewedEmail.flags?.hyperlink}
						<button class="attach-btn" onclick={linkClick}><Icon name="link" size="14px" /> Open Link</button>
					{/if}
				</div>
			{/if}
		</div>
	</AppContainer>
{/if}

<style>
	.empty {
		text-align: center;
		margin-top: 25%;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.email-row {
		width: calc(100% - 12px);
		background: var(--color-bg-panel);
		box-shadow: var(--shadow-card);
		border: none;
		border-radius: var(--radius);
		margin: 4px 6px;
		padding: 12px;
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
		text-align: left;
	}

	.email-row:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.row-icon {
		flex-shrink: 0;
		color: var(--color-text-muted);
	}

	.row-icon.unread {
		color: var(--color-primary);
	}

	.row-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.row-sender {
		font-size: 14px;
		font-weight: 700;
		color: var(--color-text);
	}

	.row-subject {
		font-size: 12px;
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.row-time {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.header-action {
		background: none;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		padding: 6px 9px;
	}

	.email-detail {
		height: 100%;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 14px;
	}

	.sender-card {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.sender-avatar {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-weight: 700;
		font-size: 16px;
	}

	.sender-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.sender-name {
		font-size: 15px;
		font-weight: 700;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.timestamp {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.expire-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin-top: 12px;
		padding: 4px 10px;
		border-radius: 12px;
		background: rgba(224, 32, 31, 0.16);
		color: var(--color-error-light);
		font-size: 13px;
		font-weight: 600;
	}

	.subject {
		margin-top: 16px;
		font-size: 19px;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1.3;
	}

	.body-card {
		margin-top: 14px;
		padding: 14px;
		background: var(--color-bg-panel);
		border-radius: 14px;
		box-shadow: var(--shadow-card);
		font-size: 14px;
		line-height: 1.6;
		color: var(--color-text);
		white-space: pre-wrap;
	}

	.attachments {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 14px;
	}

	.attach-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--color-bg-panel);
		border: none;
		border-radius: 10px;
		padding: 10px 12px;
		color: var(--color-primary-light);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		box-shadow: var(--shadow-card);
	}

	.attach-btn:hover {
		background: rgba(255, 255, 255, 0.06);
	}
</style>
