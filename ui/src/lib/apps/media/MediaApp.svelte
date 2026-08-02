<!-- photo gallery: masonry grid, lightbox, copy link, delete w/ confirm -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Loader from '../../primitives/Loader.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { MediaItem } from '../../types';

	let media = $state<MediaItem[]>([]);
	let loaded = $state(false);
	let lightbox = $state<MediaItem | null>(null);
	let pendingDelete = $state<MediaItem | null>(null);

	$effect(() => {
		if (!loaded) {
			loaded = true;
			Nui.mediaGetMedia().then((res) => {
				if (res) media = res;
			});
		}
	});

	async function copyLink(item: MediaItem) {
		try {
			await navigator.clipboard.writeText(item.image_url);
			pushAlert('Photo Link Copied!');
		} catch {
			pushAlert('Failed To Copy Link', 'error');
		}
	}

	async function confirmDelete() {
		if (!pendingDelete) return;
		const id = pendingDelete.id;
		pendingDelete = null;
		const ok = await Nui.mediaDeleteMedia(id);
		if (ok) {
			media = media.filter((m) => m.id !== id);
			pushAlert('Photo Deleted');
		} else {
			pushAlert('Failed To Delete Photo', 'error');
		}
	}
</script>

<AppContainer appId="media" useAppColor={true}>
	{#if !loaded}
		<Loader static text="Loading Media" />
	{:else if media.length === 0}
		<div class="empty">No Media Items Available</div>
	{:else}
		<div class="gallery">
			{#each media as item (item.id)}
				<div class="photo-cell">
					<button class="photo-btn" onclick={() => (lightbox = item)} aria-label={`View photo ${item.id}`}>
						<img src={item.image_url} alt={`Photo ${item.id}`} loading="lazy" />
					</button>
					<div class="photo-bar">
						<span class="photo-label">Photo: {item.id}</span>
						<button class="icon-btn" onclick={() => copyLink(item)} aria-label="Copy link"><Icon name="link" size="12px" /></button>
						<button class="icon-btn" onclick={() => (pendingDelete = item)} aria-label="Delete photo"><Icon name="trash" size="12px" /></button>
					</div>
				</div>
			{/each}
		</div>
		<div class="footnote">*only pulls the latest 10 until further update</div>
	{/if}
</AppContainer>

{#if lightbox}
	<div
		class="lightbox-backdrop"
		onclick={() => (lightbox = null)}
		onkeydown={(e) => e.key === 'Escape' && (lightbox = null)}
		role="button"
		tabindex="-1"
		aria-label="Close photo"
	>
		<div class="lightbox-image-wrap" onclick={(e) => e.stopPropagation()} role="presentation">
			<img src={lightbox.image_url} alt={`Photo ${lightbox.id}`} />
		</div>
		<button class="lightbox-close" onclick={() => (lightbox = null)} aria-label="Close"><Icon name="xmark" size="18px" /></button>
	</div>
{/if}

<Modal
	showing={pendingDelete !== null}
	title={`Delete Photo: ${pendingDelete?.id ?? ''}?`}
	acceptLabel="Delete"
	closeLabel="Cancel"
	onAccept={confirmDelete}
	onClose={() => (pendingDelete = null)}
>
	<p>Are you sure you want to delete? Photo cannot be restored once deleted.</p>
</Modal>

<style>
	.empty {
		text-align: center;
		margin-top: 25%;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.gallery {
		columns: 2;
		column-gap: 8px;
		padding: 10px;
	}

	.photo-cell {
		break-inside: avoid;
		margin-bottom: 8px;
		border-radius: 12px;
		overflow: hidden;
		background: var(--color-bg-panel);
		box-shadow: var(--shadow-card);
		position: relative;
	}

	.photo-btn {
		display: block;
		width: 100%;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
	}

	.photo-btn img {
		width: 100%;
		display: block;
		object-fit: cover;
	}

	.photo-bar {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 8px;
		background: rgba(0, 0, 0, 0.5);
	}

	.photo-label {
		flex: 1;
		font-size: 12.5px;
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.icon-btn {
		background: none;
		border: none;
		color: #fff;
		cursor: pointer;
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.footnote {
		text-align: center;
		font-size: 12.5px;
		color: var(--color-text-muted);
		padding: 4px 0 10px;
	}

	.lightbox-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 600;
		padding: 20px;
	}

	.lightbox-image-wrap {
		max-width: 100%;
		max-height: 100%;
		display: flex;
	}

	.lightbox-backdrop img {
		max-width: 100%;
		max-height: 100%;
		border-radius: 10px;
		object-fit: contain;
	}

	.lightbox-close {
		position: absolute;
		top: 16px;
		right: 16px;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.15);
		border: none;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
</style>
