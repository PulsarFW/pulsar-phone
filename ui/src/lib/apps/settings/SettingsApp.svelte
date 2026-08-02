<!-- main settings list + profile/app-notifs/sounds/wallpaper/colors sub-screens -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import { dataState, updatePlayerSetting } from '../../store/data.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import { WALLPAPERS, applyAccentColor, adjustColor } from '../../../config';

	const RINGTONES = Array.from({ length: 16 }, (_, i) => ({ value: `ringtone${i + 1}.ogg`, label: `Ringtone ${i + 1}` }));
	const TEXTTONES = Array.from({ length: 4 }, (_, i) => ({ value: `text${i + 1}.ogg`, label: `Text Tone ${i + 1}` }));

	const view = $derived(
		['profile', 'app_notifs', 'sounds', 'wallpaper', 'colors'].includes(navState.route) ? (navState.route as 'profile' | 'app_notifs' | 'sounds' | 'wallpaper' | 'colors') : 'main',
	);

	const settings = $derived(dataState.player?.PhoneSettings);
	const SETTINGS_THEME_COLOR = '#3d6bcf';
	const accentHex = $derived(settings?.colors.accent ?? '#7c1ac1');
	const shadeLight2 = $derived(adjustColor(accentHex, 35));
	const shadeLight1 = $derived(adjustColor(accentHex, 15));
	const shadeDark1 = $derived(adjustColor(accentHex, -20));
	const shadeDark2 = $derived(adjustColor(accentHex, -35));

	function setSetting<K extends string>(key: K, value: unknown) {
		updatePlayerSetting(key as never, value as never);
		Nui.updateSetting(key, value);
	}

	function toggleNotifications() {
		if (!settings) return;
		setSetting('notifications', !settings.notifications);
	}

	// volume/zoom are draft-then-save, not live - the slider value only gets sent via UpdateSetting
	// when the save icon next to it is clicked
	let volumeDraft = $state(100);
	let zoomDraft = $state(75);
	let zoomInfoOpen = $state(false);
	$effect(() => {
		if (view === 'main' && settings) {
			volumeDraft = settings.volume;
			zoomDraft = settings.zoom;
		}
	});

	function toggleMute() {
		if (!settings) return;
		setSetting('volume', settings.volume === 0 ? 100 : 0);
	}

	function saveVolume() {
		setSetting('volume', volumeDraft);
	}

	function saveZoom() {
		setSetting('zoom', zoomDraft);
	}

	// profile
	let aliasName = $state('');
	$effect(() => {
		if (view === 'profile') aliasName = dataState.player?.Alias?.settings?.name ?? '';
	});
	async function saveAlias() {
		const ok = await Nui.updateAlias('settings', { name: aliasName.trim() }, false);
		if (ok) pushAlert('Profile Updated');
		else pushAlert('Failed To Update Profile', 'error');
	}

	// app notifications
	const installedApps = $derived(
		(dataState.player?.Apps.installed ?? [])
			.map((name) => dataState.appRegistry[name])
			.filter((a): a is NonNullable<typeof a> => Boolean(a))
			.sort((a, b) => a.storeLabel.localeCompare(b.storeLabel)),
	);
	function appNotifMuted(name: string): boolean {
		return Boolean(settings?.appNotifications?.[name]);
	}
	function toggleAppNotif(name: string) {
		if (!settings) return;
		setSetting('appNotifications', { ...settings.appNotifications, [name]: !appNotifMuted(name) });
	}

	// sounds
	let testing = $state('');
	function testSound(val: string) {
		testing = val;
		Nui.testSound(val);
	}

	// colors
	let accentDraft = $state('#7c1ac1');
	$effect(() => {
		if (view === 'colors') accentDraft = settings?.colors.accent ?? '#7c1ac1';
	});
	function onAccentInput(hex: string) {
		accentDraft = hex;
		applyAccentColor(hex);
	}
	function saveAccent() {
		if (!settings) return;
		setSetting('colors', { ...settings.colors, accent: accentDraft });
		pushAlert('Accent Color Saved');
	}
</script>

{#if view === 'main'}
	<AppContainer appId="settings" colorOverride={SETTINGS_THEME_COLOR}>
		<div class="settings-list">
			<button class="flat-row profile-row" onclick={() => navigateToApp('settings', 'profile')}>
				<span class="badge" style:background={accentHex}>{dataState.player?.First?.charAt(0) ?? '?'}</span>
				<span class="flat-label">
					<span class="row-title">{dataState.player?.First} {dataState.player?.Last}</span>
					<span class="row-sub">{dataState.player?.Phone}</span>
				</span>
				<Icon name="chevron-right" size="13px" />
			</button>

			<div class="section-label">Notifications</div>
			<button class="flat-row" onclick={toggleNotifications}>
				<span class="badge" style:background={accentHex}><Icon name="bell" size="14px" /></span>
				<span class="flat-label">Notifications</span>
				<span class="toggle" class:on={settings?.notifications}></span>
			</button>
			<button class="flat-row" onclick={() => navigateToApp('settings', 'app_notifs')}>
				<span class="badge" style:background={shadeLight1}><Icon name="bell-slash" size="14px" /></span>
				<span class="flat-label">App Notifications</span>
				<Icon name="chevron-right" size="13px" />
			</button>

			<div class="section-label">Sound &amp; Display</div>
			<div class="flat-row slider-row">
				<button
					class="badge as-btn"
					class:muted={settings?.volume === 0}
					style:background={shadeDark1}
					onclick={toggleMute}
					aria-label={settings?.volume === 0 ? 'Unmute' : 'Mute'}
				>
					<Icon name={settings?.volume === 0 ? 'volume-xmark' : 'volume-high'} size="14px" />
				</button>
				<span class="flat-label">Volume</span>
				<input type="range" min="0" max="100" step="1" bind:value={volumeDraft} />
				<button class="save-icon-btn" disabled={volumeDraft === settings?.volume} onclick={saveVolume} aria-label="Save volume">
					<Icon name="floppy-disk" size="14px" />
				</button>
			</div>
			<button class="flat-row" onclick={() => navigateToApp('settings', 'sounds')}>
				<span class="badge" style:background={shadeLight2}><Icon name="music" size="14px" /></span>
				<span class="flat-label">Sounds</span>
				<Icon name="chevron-right" size="13px" />
			</button>
			<button class="flat-row" onclick={() => navigateToApp('settings', 'wallpaper')}>
				<span class="badge" style:background={shadeDark2}><Icon name="image" size="14px" /></span>
				<span class="flat-label">Wallpaper</span>
				<Icon name="chevron-right" size="13px" />
			</button>
			<div class="flat-row slider-row">
				<button class="badge as-btn" style:background={shadeLight1} onclick={() => (zoomInfoOpen = true)} aria-label="Zoom info">
					<Icon name="magnifying-glass" size="13px" />
				</button>
				<span class="flat-label">Zoom</span>
				<input type="range" min="50" max="100" step="1" bind:value={zoomDraft} />
				<button class="save-icon-btn" disabled={zoomDraft === settings?.zoom} onclick={saveZoom} aria-label="Save zoom">
					<Icon name="floppy-disk" size="14px" />
				</button>
			</div>
			<button class="flat-row" onclick={() => navigateToApp('settings', 'colors')}>
				<span class="badge" style:background="conic-gradient(from 180deg, #ff5b5b, #ffcf4a, #5eff9d, #5eb3ff, #b06eff, #ff5b5b)"><Icon name="palette" size="14px" /></span>
				<span class="flat-label">Colors</span>
				<Icon name="chevron-right" size="13px" />
			</button>
			<div class="version">Pulsar OS 1.0</div>
		</div>
	</AppContainer>
{:else if view === 'profile'}
	<AppContainer appId="settings" colorOverride={SETTINGS_THEME_COLOR}>
		{#snippet actions()}
			<button class="header-action" onclick={saveAlias} aria-label="Save"><Icon name="floppy-disk" size="20px" /></button>
		{/snippet}
		<div class="profile-form">
			<div class="avatar large">{dataState.player?.First?.charAt(0) ?? '?'}</div>
			<label class="field">
				<span>Display Name</span>
				<input bind:value={aliasName} maxlength={32} />
			</label>
			<div class="readonly-row"><span>Legal Name</span><span>{dataState.player?.First} {dataState.player?.Last}</span></div>
			<div class="readonly-row"><span>Number</span><span>{dataState.player?.Phone}</span></div>
		</div>
	</AppContainer>
{:else if view === 'app_notifs'}
	<AppContainer appId="settings" colorOverride={SETTINGS_THEME_COLOR}>
		<div class="settings-list">
			<div class="section-label">Apps</div>
			{#each installedApps as app (app.name)}
				<button class="flat-row" onclick={() => toggleAppNotif(app.name)}>
					<span class="badge" style:background={app.color}><Icon name={typeof app.icon === 'string' ? app.icon : app.icon[1]} size="14px" /></span>
					<span class="flat-label">{app.storeLabel}</span>
					<span class="toggle" class:on={!appNotifMuted(app.name)}></span>
				</button>
			{/each}
		</div>
	</AppContainer>
{:else if view === 'sounds'}
	<AppContainer appId="settings" colorOverride={SETTINGS_THEME_COLOR}>
		<div class="settings-list">
			<div class="section-label">Ringtone</div>
			{#each RINGTONES as tone (tone.value)}
				<div class="sound-row" class:selected={settings?.ringtone === tone.value}>
					<button class="sound-select" onclick={() => setSetting('ringtone', tone.value)}>{tone.label}</button>
					<button class="test-btn" class:playing={testing === tone.value} onclick={() => testSound(tone.value)} aria-label={`Test ${tone.label}`}>
						<Icon name={testing === tone.value ? 'stop' : 'play'} size="12px" />
					</button>
				</div>
			{/each}
			<div class="section-label">Text Tone</div>
			{#each TEXTTONES as tone (tone.value)}
				<div class="sound-row" class:selected={settings?.texttone === tone.value}>
					<button class="sound-select" onclick={() => setSetting('texttone', tone.value)}>{tone.label}</button>
					<button class="test-btn" class:playing={testing === tone.value} onclick={() => testSound(tone.value)} aria-label={`Test ${tone.label}`}>
						<Icon name={testing === tone.value ? 'stop' : 'play'} size="12px" />
					</button>
				</div>
			{/each}
		</div>
	</AppContainer>
{:else if view === 'wallpaper'}
	<AppContainer appId="settings" colorOverride={SETTINGS_THEME_COLOR}>
		<div class="wallpaper-grid">
			{#each WALLPAPERS as wp (wp.id)}
				<button class="wallpaper-cell" class:selected={settings?.wallpaper === wp.id} onclick={() => setSetting('wallpaper', wp.id)}>
					<img src={wp.file} alt={wp.label} />
				</button>
			{/each}
		</div>
	</AppContainer>
{:else}
	<AppContainer appId="settings" colorOverride={SETTINGS_THEME_COLOR}>
		{#snippet actions()}
			<button class="header-action" onclick={saveAccent} aria-label="Save"><Icon name="floppy-disk" size="20px" /></button>
		{/snippet}
		<div class="colors-panel">
			<div class="accent-preview" style:background={accentDraft}></div>
			<input class="color-input" type="color" value={accentDraft} oninput={(e) => onAccentInput((e.currentTarget as HTMLInputElement).value)} />
		</div>
	</AppContainer>
{/if}

<Modal showing={zoomInfoOpen} title="Phone Zoom" acceptLabel="Got It" closeLabel="Close" onAccept={() => (zoomInfoOpen = false)} onClose={() => (zoomInfoOpen = false)}>
	<p>Zooming only works when the phone is minimized.</p>
	<p>Zooming may have adverse effects on some features, things like hover tooltips may not work correctly (or at all on lower zooms). <b>You've been warned.</b></p>
</Modal>

<style>
	.settings-list {
		height: 100%;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 14px 12px 20px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.section-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-alt);
		padding: 14px 6px 6px;
	}

	.flat-row {
		width: 100%;
		background: none;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 4px;
		cursor: pointer;
		color: var(--color-text);
		font-size: 14px;
	}

	.flat-row:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.profile-row {
		padding: 12px 4px;
	}

	.flat-label {
		flex: 1;
		text-align: left;
		display: flex;
		flex-direction: column;
	}

	.row-title {
		font-weight: 600;
		font-size: 15px;
	}

	.row-sub {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.badge {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-weight: 700;
		font-size: 13px;
		flex-shrink: 0;
	}

	.badge.as-btn {
		border: none;
		cursor: pointer;
	}

	.badge.as-btn.muted {
		filter: grayscale(0.7) brightness(0.75);
	}

	.avatar.large {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		background: var(--color-primary);
		color: #fff;
		font-size: 36px;
		font-weight: 700;
		margin: 20px auto;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.slider-row {
		cursor: default;
	}

	.slider-row input[type='range'] {
		flex: 1;
		max-width: 100px;
		accent-color: var(--color-primary);
	}

	.save-icon-btn {
		background: none;
		border: none;
		color: var(--color-text-alt);
		cursor: pointer;
		width: 24px;
		height: 24px;
		flex-shrink: 0;
	}

	.save-icon-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.save-icon-btn:not(:disabled) {
		color: var(--color-success);
	}

	.toggle {
		width: 36px;
		height: 20px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.2);
		position: relative;
		flex-shrink: 0;
	}

	.toggle::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #fff;
		transition: left 120ms ease;
	}

	.toggle.on {
		background: var(--color-success);
	}

	.toggle.on::after {
		left: 18px;
	}

	.version {
		text-align: center;
		font-size: 12.5px;
		color: var(--color-text-muted);
		padding: 10px 16px 0;
	}

	.header-action {
		background: none;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		padding: 6px 9px;
	}

	.profile-form {
		padding: 0 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
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

	.readonly-row {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		color: var(--color-text-alt);
		padding: 6px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.sound-row {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		color: var(--color-text);
		font-size: 14px;
	}

	.sound-row.selected {
		color: var(--color-primary);
	}

	.sound-select {
		flex: 1;
		background: none;
		border: none;
		text-align: left;
		padding: 10px 14px;
		cursor: pointer;
		color: inherit;
		font-size: inherit;
	}

	.test-btn {
		background: rgba(255, 255, 255, 0.08);
		border: none;
		border-radius: 50%;
		color: inherit;
		cursor: pointer;
		width: 26px;
		height: 26px;
		margin-right: 10px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.test-btn.playing {
		background: var(--color-primary);
		color: #fff;
	}

	.wallpaper-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
		padding: 10px;
	}

	.wallpaper-cell {
		background: none;
		border: 2px solid transparent;
		border-radius: var(--radius);
		padding: 0;
		overflow: hidden;
		cursor: pointer;
		aspect-ratio: 9 / 16;
	}

	.wallpaper-cell.selected {
		border-color: var(--color-primary);
	}

	.wallpaper-cell img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.colors-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding: 30px 0;
	}

	.accent-preview {
		width: 100px;
		height: 100px;
		border-radius: 50%;
	}

	.color-input {
		width: 120px;
		height: 40px;
		border: none;
		background: none;
		cursor: pointer;
	}
</style>
