<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import { musicState } from '../../store/music.svelte';
</script>

<AppContainer appId="music" useAppColor={true}>
	<div class="music">
		{#if musicState.currentSong}
			{@const song = musicState.currentSong}
			<div class="art">
				<Icon name="compact-disc" size="48px" />
			</div>
			<div class="title">{song.title}</div>
			<div class="label">{song.label_name}</div>
			<div class="status" class:playing={song.isPlaying}>
				<Icon name={song.isPlaying ? 'volume-high' : 'pause'} size="12px" />
				{song.isPlaying ? 'Now Playing' : 'Paused'}
			</div>
		{:else}
			<div class="art empty">
				<Icon name="cloud-music" size="40px" />
			</div>
			<div class="empty-text">Nothing Playing</div>
			<div class="empty-sub">Tune in on an in-game radio to see what's playing here.</div>
		{/if}
	</div>
</AppContainer>

<style>
	.music {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 20px;
		text-align: center;
	}

	.art {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		background: var(--color-bg-panel);
		box-shadow: var(--shadow-card);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-primary-light);
		margin-bottom: 8px;
	}

	.art.empty {
		color: var(--color-text-muted);
	}

	.title {
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text);
	}

	.label {
		font-size: 13px;
		color: var(--color-text-muted);
		text-transform: capitalize;
	}

	.status {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 10px;
		padding: 4px 12px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.07);
		color: var(--color-text-muted);
		font-size: 12px;
		font-weight: 600;
	}

	.status.playing {
		color: var(--color-success);
	}

	.empty-text {
		font-size: 16px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.empty-sub {
		font-size: 12.5px;
		color: var(--color-text-muted);
		max-width: 240px;
	}
</style>
