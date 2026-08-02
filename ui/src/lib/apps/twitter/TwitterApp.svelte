<!-- Spammer (Twitter clone) - link/hashtag/mention highlighting via regex spans, not live HTML embedding,
	 since tweet content is arbitrary user text -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Loader from '../../primitives/Loader.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import Confirm from '../../primitives/Confirm.svelte';
	import AppInput from '../../primitives/AppInput.svelte';
	import { dataState } from '../../store/data.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { Tweet } from '../../types';

	const appColor = $derived(dataState.appRegistry['twitter']?.color ?? '#00aced');
	const view = $derived(navState.route === 'profile' ? 'profile' : 'list');
	const myProfile = $derived(dataState.player?.Profiles?.twitter);

	let tweets = $state<Tweet[]>([]);
	let tweetCount = $state(0);
	let loading = $state(false);
	let loaded = $state(false);

	async function loadMore() {
		if (loading) return;
		loading = true;
		const [count, res] = await Promise.all([Nui.twitterGetCount(), Nui.twitterGetTweets(tweets.length)]);
		if (typeof count === 'number') tweetCount = count;
		if (res) tweets = [...tweets, ...res];
		loading = false;
		loaded = true;
	}

	$effect(() => {
		if (!loaded) loadMore();
	});

	const sortedTweets = $derived([...tweets].sort((a, b) => b.time - a.time));

	function timeAgo(unixSeconds: number): string {
		const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
		if (diff < 60) return 'now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
		return `${Math.floor(diff / 86400)}d`;
	}

	function retweetCount(id: number): number {
		return tweets.filter((t) => t.retweet === id).length;
	}

	// highlight #hashtags, @mentions, and bare URLs as colored spans, split from plain text runs
	interface ContentPart {
		text: string;
		kind: 'text' | 'tag' | 'link';
	}
	function highlight(content: string): ContentPart[] {
		const parts: ContentPart[] = [];
		const re = /(#\w+|@\w+|https?:\/\/\S+)/g;
		let lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = re.exec(content))) {
			if (match.index > lastIndex) parts.push({ text: content.slice(lastIndex, match.index), kind: 'text' });
			parts.push({ text: match[0], kind: match[0].startsWith('http') ? 'link' : 'tag' });
			lastIndex = match.index + match[0].length;
		}
		if (lastIndex < content.length) parts.push({ text: content.slice(lastIndex), kind: 'text' });
		return parts;
	}

	async function copyLink(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			pushAlert('Link Copied To Clipboard');
		} catch {
			pushAlert('Failed To Copy Link', 'error');
		}
	}

	// compose
	let composing = $state(false);
	let draftContent = $state('');
	let usingImg = $state(false);
	let draftImg = $state('');
	let submitting = $state(false);

	function openCompose() {
		draftContent = '';
		usingImg = false;
		draftImg = '';
		composing = true;
	}

	function openReply(name: string) {
		draftContent = `@${name} `;
		usingImg = false;
		draftImg = '';
		composing = true;
	}

	async function submitTweet() {
		if (!draftContent.trim()) return;
		submitting = true;
		const res = await Nui.twitterSendTweet({
			time: Math.floor(Date.now() / 1000),
			content: draftContent,
			image: { using: usingImg, link: usingImg ? draftImg : null },
		});
		submitting = false;
		composing = false;
		if (res) {
			tweets = [...tweets, res];
			tweetCount += 1;
			pushAlert('Spam Created');
		} else {
			pushAlert('Unable To Create Spam', 'error');
		}
	}

	// retweet
	let pendingRetweet = $state<Tweet | null>(null);

	async function confirmRetweet() {
		if (!pendingRetweet || !myProfile) return;
		const source = pendingRetweet;
		pendingRetweet = null;
		const res = await Nui.twitterSendTweet({
			author: { name: myProfile.name, picture: myProfile.picture },
			content: `RESPAM: @${source.author.name} "${source.content}"`,
			time: Math.floor(Date.now() / 1000),
			retweet: source.id,
			image: { using: false, link: null },
		});
		if (res) {
			tweets = [...tweets, res];
			tweetCount += 1;
			pushAlert('Respammed');
		} else {
			pushAlert('Unable To Respam', 'error');
		}
	}

	// profile
	let profileName = $state('');
	let profilePicture = $state('');
	let profileDirty = $state(false);
	let savingProfile = $state(false);

	$effect(() => {
		if (view === 'profile') {
			profileName = myProfile?.name ?? '';
			profilePicture = myProfile?.picture ?? '';
			profileDirty = false;
		}
	});

	function onProfileInput() {
		profileDirty = profileName !== (myProfile?.name ?? '') || profilePicture !== (myProfile?.picture ?? '');
	}

	async function saveProfile() {
		if (!profileDirty) return;
		savingProfile = true;
		const ok = await Nui.updateProfile('twitter', { name: profileName, picture: profilePicture });
		savingProfile = false;
		if (ok && dataState.player) {
			dataState.player = {
				...dataState.player,
				Profiles: { ...dataState.player.Profiles, twitter: { sid: dataState.player.SID, app: 'twitter', name: profileName, picture: profilePicture } },
			};
			profileDirty = false;
			pushAlert('Profile Updated');
		} else {
			pushAlert('Unable To Update Profile', 'error');
		}
	}
</script>

{#if view === 'list'}
	<AppContainer appId="twitter" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('twitter', 'profile')} aria-label="Profile"><Icon name="circle-user" size="20px" /></button>
			<button class="header-action" onclick={openCompose} disabled={!myProfile} aria-label="New Spam"><Icon name="plus" size="20px" /></button>
		{/snippet}
		<div class="feed">
			{#each sortedTweets as tweet (tweet.id)}
				<div class="tweet">
					<div class="tweet-header">
						<span class="avatar">{tweet.author.picture ? '' : tweet.author.name.charAt(0)}</span>
						<span class="username">
							{tweet.author.name}
							{#if tweet.verified}
								<span class="verified" class:business={tweet.verified === 'business'} class:government={tweet.verified === 'government'}>
									<Icon name="badge-check" size="12px" />
								</span>
							{/if}
						</span>
						<span class="timestamp">{timeAgo(tweet.time)}</span>
					</div>
					<div class="tweet-content">
						{#each highlight(tweet.content) as part, i (i)}
							{#if part.kind === 'text'}{part.text}{:else if part.kind === 'tag'}<span class="hashtag">{part.text}</span
								>{:else}<button class="link" onclick={() => copyLink(part.text)}>{part.text}</button>{/if}
						{/each}
					</div>
					{#if tweet.image.using && tweet.image.link}
						<img class="tweet-image" src={tweet.image.link} alt="" loading="lazy" />
					{/if}
					<div class="tweet-actions">
						<button class="action-btn" onclick={() => openReply(tweet.author.name)} disabled={!myProfile}><Icon name="reply" size="14px" /></button>
						<button
							class="action-btn"
							onclick={() => (pendingRetweet = tweet)}
							disabled={!myProfile || Boolean(tweet.retweet) || tweet.author.name === myProfile?.name}
						>
							<span class="rt-count">{retweetCount(tweet.id)}</span><Icon name="arrows-rotate" size="14px" />
						</button>
					</div>
				</div>
			{/each}
			{#if loading}
				<Loader static text="Loading Spam" />
			{:else if tweets.length >= tweetCount && tweets.length > 0}
				<div class="end-msg">You've read all the spam, nice</div>
			{:else if tweets.length < tweetCount}
				<button class="load-more" onclick={loadMore}>Load More</button>
			{/if}
			{#if tweets.length === 0 && loaded && !loading}
				<div class="empty">No Spam Yet</div>
			{/if}
		</div>
	</AppContainer>
{:else}
	<AppContainer appId="twitter" title="Edit Profile" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('twitter')} aria-label="Back"><Icon name="chevron-left" size="20px" /></button>
			{#if profileDirty}
				<button class="header-action" onclick={saveProfile} disabled={savingProfile} aria-label="Save"><Icon name="floppy-disk" size="20px" /></button>
			{/if}
		{/snippet}
		<div class="profile-form">
			<span class="profile-avatar" class:pending={profileDirty}>
				{#if profilePicture}<img src={profilePicture} alt="" />{:else}<Icon name="user" size="40px" />{/if}
			</span>
			<AppInput label="Username" bind:value={profileName} oninput={onProfileInput} accent={appColor} maxlength={64} />
			<AppInput label="Avatar Link" bind:value={profilePicture} oninput={onProfileInput} accent={appColor} maxlength={512} />
		</div>
	</AppContainer>
{/if}

<Modal
	showing={composing}
	title="Send New Spam"
	acceptLabel={submitting ? 'Sending...' : 'Send Spam'}
	closeLabel="Cancel"
	onAccept={submitTweet}
	onClose={() => (composing = false)}
>
	<label class="content-field">
		<span>{draftContent.length} / 180 Characters</span>
		<textarea bind:value={draftContent} maxlength={180} rows={5}></textarea>
	</label>
	<button class="img-toggle" onclick={() => (usingImg = !usingImg)}>{usingImg ? 'Remove Image' : 'Attach Image'}</button>
	{#if usingImg}
		{#if draftImg}<img class="img-preview" src={draftImg} alt="" />{/if}
		<AppInput label="Image (Imgur Links Only)" bind:value={draftImg} accent={appColor} />
	{/if}
</Modal>

<Confirm showing={pendingRetweet !== null} title="Respam?" acceptLabel="Respam" denyLabel="Cancel" onAccept={confirmRetweet} onDeny={() => (pendingRetweet = null)} />

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

	.feed {
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.tweet {
		background: var(--color-bg-panel);
		border-radius: 12px;
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}

	.tweet-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--color-primary);
		color: #fff;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.username {
		flex: 1;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.verified {
		color: #00aced;
	}

	.verified.business {
		color: #eac93e;
	}

	.verified.government {
		color: #829aab;
	}

	.timestamp {
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	.tweet-content {
		padding: 10px;
		font-size: 13.5px;
		line-height: 1.5;
		color: var(--color-text-alt);
		white-space: pre-wrap;
		overflow-wrap: break-word;
	}

	.hashtag {
		color: var(--color-primary-light);
	}

	.link {
		background: none;
		border: none;
		padding: 0;
		color: #1de9b6;
		text-decoration: underline;
		cursor: pointer;
		font: inherit;
	}

	.tweet-image {
		display: block;
		max-width: 100%;
		max-height: 260px;
		object-fit: cover;
		margin: 0 auto;
	}

	.tweet-actions {
		display: flex;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.action-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		background: none;
		border: none;
		padding: 8px;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.action-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.rt-count {
		font-size: 12px;
	}

	.end-msg,
	.empty {
		text-align: center;
		font-size: 12px;
		color: var(--color-text-muted);
		padding: 16px;
	}

	.load-more {
		background: none;
		border: none;
		color: var(--color-primary-light);
		font-size: 13px;
		font-weight: 600;
		padding: 10px;
		cursor: pointer;
	}

	.content-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.content-field span {
		font-size: 12.5px;
		color: var(--color-text-alt);
	}

	.content-field textarea {
		background: transparent;
		border: var(--border-input);
		border-radius: var(--radius);
		padding: 8px 10px;
		font-size: 14px;
		color: var(--color-text);
		resize: none;
		font-family: inherit;
	}

	.img-toggle {
		margin-top: 10px;
		background: none;
		border: none;
		color: var(--color-primary-light);
		font-size: 13px;
		cursor: pointer;
		padding: 4px 0;
	}

	.img-preview {
		max-width: 100%;
		max-height: 200px;
		display: block;
		margin: 8px auto;
		border-radius: 6px;
	}

	.profile-form {
		padding: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.profile-avatar {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		background: #00aced;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.profile-avatar.pending {
		border: 3px solid var(--color-warning, #e0a020);
	}

	.profile-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
