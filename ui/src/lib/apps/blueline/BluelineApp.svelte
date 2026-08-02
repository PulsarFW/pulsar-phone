<!-- Trials (PD races) - restricted to on-duty police with a Callsign set. Admin's track-creator flow
	 drives a live 3D checkpoint placement in the game world; this screen only exposes the start/cancel/save
	 triggers, no in-app creator progress is rendered. -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import Confirm from '../../primitives/Confirm.svelte';
	import Dropdown from '../../primitives/Dropdown.svelte';
	import { dataState } from '../../store/data.svelte';
	import { bluelineState, addLocalRace, setCreatorActive } from '../../store/blueline.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { PDTrack } from '../../types';

	const view = $derived.by(() => {
		if (navState.route === 'completed') return 'completed';
		if (navState.route === 'new') return 'new';
		if (navState.route === 'admin') return 'admin';
		if (navState.route.startsWith('view/')) return 'view';
		return 'list';
	});
	const targetId = $derived(view === 'view' ? navState.route.slice('view/'.length) : null);

	const alias = $derived(dataState.player?.Callsign);
	const onDuty = $derived(dataState.onDuty);
	const authorized = $derived(Boolean(alias) && onDuty === 'police');
	const jobPerms = $derived((dataState.extra.JobPermissions as Record<string, Record<string, boolean>> | undefined) ?? {});
	const canCreate = $derived(Boolean(jobPerms.police?.PD_MANAGE_TRIALS));
	const tracks = $derived((dataState.extra.tracks_pd as PDTrack[] | undefined) ?? []);
	const mySid = $derived(dataState.player?.SID);

	function trackFor(id: number): PDTrack | undefined {
		return tracks.find((t) => t.id === id);
	}

	function timeAgo(unixSeconds: number | undefined): string {
		if (!unixSeconds) return '';
		const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
		if (diff < 60) return 'Just Now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m Ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h Ago`;
		return `${Math.floor(diff / 86400)}d Ago`;
	}

	function formatDuration(ms: number): string {
		const totalMs = Math.max(0, ms);
		const hours = Math.floor(totalMs / 3_600_000);
		const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
		const seconds = Math.floor((totalMs % 60_000) / 1000);
		const millis = Math.floor(totalMs % 1000);
		return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(millis).padStart(3, '0')}`;
	}

	const pendingRaces = $derived(
		Object.values(bluelineState.races)
			.filter((r) => r.state !== -1 && r.state !== 2)
			.sort((a, b) => (b.time ?? 0) - (a.time ?? 0)),
	);
	const recentRaces = $derived(
		Object.values(bluelineState.races)
			.filter((r) => (r.state === -1 || r.state === 2) && trackFor(r.track))
			.sort((a, b) => (b.time ?? 0) - (a.time ?? 0)),
	);
	const viewedRace = $derived(targetId !== null ? bluelineState.races[targetId] : undefined);
	const viewedTrack = $derived(viewedRace ? trackFor(viewedRace.track) : undefined);

	// new race form
	let formName = $state('');
	let formTrack = $state<number | null>(null);
	let formBuyin = $state('');
	let formLaps = $state(1);
	let formDnfStart = $state('');
	let formDnfTime = $state('');
	let formCountdown = $state('20');

	$effect(() => {
		if (view === 'new') {
			formName = '';
			formTrack = tracks.length > 0 ? tracks[0].id : null;
			formBuyin = '';
			formLaps = 1;
			formDnfStart = '';
			formDnfTime = '';
			formCountdown = '20';
		}
	});

	async function submitCreate() {
		if (!formName.trim() || !alias || formTrack === null) return;
		const res = await Nui.bluelineCreateRace({
			name: formName.trim(),
			host: alias,
			track: formTrack,
			buyin: formBuyin,
			laps: formLaps,
			dnf_start: formDnfStart,
			dnf_time: formDnfTime,
			countdown: formCountdown,
			phasing: false,
			class: 'All',
		});
		if (res && !('failed' in res)) {
			addLocalRace(res);
			pushAlert('Race Created');
			navigateToApp('blueline', `view/${res.id}`);
		} else {
			pushAlert(res && 'message' in res ? res.message : 'Unable To Create Race', 'error');
		}
	}

	// race view actions
	async function joinRace() {
		if (!viewedRace) return;
		const res = await Nui.bluelineJoinRace(viewedRace.id);
		pushAlert(res ? 'Joined Race' : 'Unable To Join Race', res ? 'info' : 'error');
	}

	async function leaveRace() {
		if (!viewedRace) return;
		const ok = await Nui.bluelineLeaveRace(viewedRace.id);
		if (ok) {
			pushAlert('Left Race');
			navigateToApp('blueline');
		} else {
			pushAlert('Unable To Leave Race', 'error');
		}
	}

	async function cancelRace() {
		if (!viewedRace) return;
		const ok = await Nui.bluelineCancelRace(viewedRace.id);
		if (ok) {
			pushAlert('Cancelled Race');
			navigateToApp('blueline');
		} else {
			pushAlert('Unable To Cancel Race', 'error');
		}
	}

	async function startRace() {
		if (!viewedRace) return;
		const res = await Nui.bluelineStartRace(viewedRace.id);
		if (res === true) pushAlert('Starting Race');
		else pushAlert(res && typeof res === 'object' ? res.message : 'Unable To Start Race', 'error');
	}

	async function endRace() {
		if (!viewedRace) return;
		const ok = await Nui.bluelineEndRace(viewedRace.id);
		pushAlert(ok ? 'Race Ended' : 'Unable To End Race', ok ? 'info' : 'error');
	}

	// admin: track creator + track management
	let savingTrack = $state(false);
	let trackName = $state('');
	let trackType = $state<'laps' | 'p2p'>('laps');
	let expandedTrack = $state<number | null>(null);
	let deletingTrack = $state<number | null>(null);
	let resettingTrack = $state<number | null>(null);

	async function startCreator() {
		const ok = await Nui.bluelineCreateTrack();
		if (ok) {
			setCreatorActive(true);
			pushAlert('Creator Started');
		} else {
			pushAlert('Unable To Start Creator', 'error');
		}
	}

	async function cancelCreator() {
		await Nui.bluelineStopCreator();
		setCreatorActive(false);
	}

	async function submitTrack() {
		if (!trackName.trim()) return;
		const ok = await Nui.bluelineFinishCreator(trackName.trim(), trackType);
		pushAlert(ok ? 'Track Created' : 'Unable To Create Track', ok ? 'info' : 'error');
		savingTrack = false;
		trackName = '';
	}

	async function confirmDeleteTrack() {
		if (deletingTrack === null) return;
		const ok = await Nui.bluelineDeleteTrack(deletingTrack);
		pushAlert(ok ? 'Track Deleted' : 'Unable To Delete Track', ok ? 'info' : 'error');
		deletingTrack = null;
		expandedTrack = null;
	}

	async function confirmResetTrack() {
		if (resettingTrack === null) return;
		const ok = await Nui.bluelineResetTrackHistory(resettingTrack);
		pushAlert(ok ? 'Track History Reset' : 'Unable To Reset Track History', ok ? 'info' : 'error');
		resettingTrack = null;
	}

	const TRACK_TYPE_LABELS: Record<string, string> = { laps: 'Laps', p2p: 'Point To Point' };
</script>

{#snippet unauthorized()}
	<div class="unauthorized">Not Authorized</div>
{/snippet}

{#if view === 'list'}
	<AppContainer appId="blueline" title="Trials - Pending Races" useAppColor={true}>
		{#snippet actions()}
			{#if authorized}
				<button class="header-action" onclick={() => navigateToApp('blueline', 'completed')} aria-label="Recent Races"><Icon name="clock-rotate-left" size="20px" /></button>
				<button class="header-action" onclick={() => navigateToApp('blueline', 'new')} aria-label="New Race"><Icon name="plus" size="20px" /></button>
				{#if canCreate}
					<button class="header-action" onclick={() => navigateToApp('blueline', 'admin')} aria-label="Admin"><Icon name="shield-halved" size="20px" /></button>
				{/if}
			{/if}
		{/snippet}
		{#if !authorized}
			{@render unauthorized()}
		{:else}
			<div class="welcome">Welcome Back <span>{alias}</span></div>
			<div class="race-list">
				{#each pendingRaces as race (race.id)}
					{@const track = trackFor(race.track)}
					<button class="race-row" onclick={() => navigateToApp('blueline', `view/${race.id}`)}>
						<span class="race-class">{race.class !== 'All' ? race.class : '-'}</span>
						<span class="race-main">
							<span class="race-name">{race.name}</span>
							<span class="race-sub">{track?.Name ?? 'Unknown Track'} <small>({Object.keys(race.racers).length} Racers)</small></span>
						</span>
						<Icon name="chevron-right" size="14px" />
					</button>
				{:else}
					<div class="empty">No Pending Races</div>
				{/each}
			</div>
		{/if}
	</AppContainer>
{:else if view === 'completed'}
	<AppContainer appId="blueline" title="Trials - Recent Races" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('blueline')} aria-label="Pending Races"><Icon name="calendar-days" size="20px" /></button>
			<button class="header-action" onclick={() => navigateToApp('blueline', 'new')} aria-label="New Race"><Icon name="plus" size="20px" /></button>
			{#if canCreate}
				<button class="header-action" onclick={() => navigateToApp('blueline', 'admin')} aria-label="Admin"><Icon name="shield-halved" size="20px" /></button>
			{/if}
		{/snippet}
		{#if !authorized}
			{@render unauthorized()}
		{:else}
			<div class="welcome">Welcome Back <span>{alias}</span></div>
			<div class="race-list">
				{#each recentRaces as race (race.id)}
					{@const track = trackFor(race.track)}
					<button class="race-row" onclick={() => navigateToApp('blueline', `view/${race.id}`)}>
						<span class="race-class">{race.class !== 'All' ? race.class : '-'}</span>
						<span class="race-main">
							<span class="race-name">{race.name}</span>
							<span class="race-sub">{track?.Name ?? 'Unknown Track'} <small>({Object.keys(race.racers).length} Racers)</small></span>
						</span>
						<Icon name="chevron-right" size="14px" />
					</button>
				{:else}
					<div class="empty">No Recent Races</div>
				{/each}
			</div>
		{/if}
	</AppContainer>
{:else if view === 'new'}
	<AppContainer appId="blueline" title="New Trial" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('blueline')} aria-label="Cancel"><Icon name="xmark" size="20px" /></button>
			<button class="header-action" onclick={submitCreate} disabled={!formName.trim() || formTrack === null} aria-label="Save"><Icon name="floppy-disk" size="20px" /></button>
		{/snippet}
		{#if !authorized}
			{@render unauthorized()}
		{:else}
			<div class="form">
				<label class="field">
					<span>Host</span>
					<input value={alias} disabled />
				</label>
				<label class="field">
					<span>Track</span>
					<Dropdown bind:value={formTrack} options={tracks.map((track) => ({ value: track.id, label: track.Name }))} />
				</label>
				<label class="field">
					<span>Event Name</span>
					<input bind:value={formName} maxlength={32} />
				</label>
				<div class="field-row">
					<label class="field">
						<span>Countdown</span>
						<input type="number" bind:value={formCountdown} />
					</label>
					<label class="field">
						<span># Of Laps</span>
						<input type="number" bind:value={formLaps} disabled={trackFor(formTrack ?? -1)?.Type === 'p2p'} />
					</label>
				</div>
				<div class="field-row">
					<label class="field">
						<span>DNF Start</span>
						<input type="number" bind:value={formDnfStart} />
					</label>
					<label class="field">
						<span>DNF Time</span>
						<input type="number" bind:value={formDnfTime} />
					</label>
				</div>
			</div>
		{/if}
	</AppContainer>
{:else if view === 'view'}
	<AppContainer appId="blueline" title={viewedRace?.name ?? 'Race'} useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('blueline')} aria-label="Back"><Icon name="arrow-left" size="20px" /></button>
			{#if viewedRace}
				{#if viewedRace.host_id === mySid}
					{#if viewedRace.state === 0}
						<button class="header-action" onclick={cancelRace} aria-label="Cancel Race"><Icon name="xmark" size="20px" /></button>
						<button class="header-action" onclick={startRace} aria-label="Start Race"><Icon name="play" size="20px" /></button>
					{:else if viewedRace.state !== 2}
						<button class="header-action" onclick={endRace} aria-label="End Race"><Icon name="ban" size="20px" /></button>
					{/if}
				{:else if !bluelineState.inRace && viewedRace.state === 0}
					<button class="header-action" onclick={joinRace} aria-label="Join Race"><Icon name="right-to-bracket" size="20px" /></button>
				{:else if (viewedRace.state === 0 || viewedRace.state === 1) && alias && viewedRace.racers[alias]}
					<button class="header-action" onclick={leaveRace} aria-label="Leave Race"><Icon name="right-from-bracket" size="20px" /></button>
				{/if}
			{/if}
		{/snippet}
		{#if !authorized}
			{@render unauthorized()}
		{:else if !viewedRace}
			<div class="empty">Invalid Race Data</div>
		{:else}
			<div class="detail-section">
				<div class="section-header">Race Details</div>
				<div class="detail-item"><span class="label">Host</span><span class="value">{viewedRace.host}</span></div>
				<div class="detail-item">
					<span class="label">State</span>
					<span class="value">
						{#if viewedRace.state === -1}Cancelled{:else if viewedRace.state === 0}Setting Up{:else if viewedRace.state === 1}In Progress{:else if viewedRace.state === 2}Finished{/if}
					</span>
				</div>
				<div class="detail-item"><span class="label">Track</span><span class="value">{viewedTrack ? `${viewedTrack.Name} (${viewedTrack.Distance})` : 'Unknown'}</span></div>
				<div class="detail-item"><span class="label"># Of Laps</span><span class="value">{viewedRace.laps}</span></div>
			</div>
			<div class="detail-section racers-section">
				<div class="section-header">Racers</div>
				{#if Object.keys(viewedRace.racers).length === 0}
					<div class="empty small">No Racers Signed Up</div>
				{:else if viewedRace.state === 2}
					{@const finished = Object.entries(viewedRace.racers).filter(([, r]) => r.finished)}
					{@const dnf = Object.entries(viewedRace.racers).filter(([, r]) => !r.finished)}
					{#each finished.sort((a, b) => (Number(a[1].place) || 99) - (Number(b[1].place) || 99)) as [name, racer] (name)}
						<div class="racer-row">
							<span class="racer-place">{racer.place ? `#${racer.place}` : 'DNF'}</span>
							<span class="racer-main">
								<span class="racer-name">{name}</span>
								{#if racer.fastest}<span class="racer-sub">Fastest Lap: {formatDuration(racer.fastest.lap_end - racer.fastest.lap_start)}</span>{/if}
							</span>
						</div>
					{/each}
					{#each dnf as [name] (name)}
						<div class="racer-row">
							<span class="racer-place">-</span>
							<span class="racer-main"><span class="racer-name">{name}</span></span>
						</div>
					{/each}
				{:else}
					{#each Object.keys(viewedRace.racers) as name (name)}
						<div class="racer-row">
							<span class="racer-place">-</span>
							<span class="racer-main"><span class="racer-name">{name}</span></span>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</AppContainer>
{:else if view === 'admin'}
	<AppContainer appId="blueline" title="Trials Admin" useAppColor={true}>
		{#snippet actions()}
			{#if authorized && canCreate}
				{#if !bluelineState.creatorActive}
					<button class="header-action" onclick={startCreator} aria-label="Start Track Creator"><Icon name="plus" size="20px" /></button>
				{:else}
					<button class="header-action" onclick={cancelCreator} aria-label="Cancel Creator"><Icon name="xmark" size="20px" /></button>
					<button class="header-action" onclick={() => (savingTrack = true)} aria-label="Save Track"><Icon name="floppy-disk" size="20px" /></button>
				{/if}
			{/if}
		{/snippet}
		{#if !authorized || !canCreate}
			{@render unauthorized()}
		{:else}
			<div class="track-list">
				{#each tracks as track (track.id)}
					<div class="track-card">
						<button class="track-summary" onclick={() => (expandedTrack = expandedTrack === track.id ? null : track.id)}>
							<span class="track-main">
								<span class="track-name">{track.Name}</span>
								<span class="track-sub">{track.Distance}</span>
							</span>
							<Icon name={expandedTrack === track.id ? 'chevron-up' : 'chevron-down'} size="13px" />
						</button>
						{#if expandedTrack === track.id}
							<div class="track-details">
								<div class="detail-item"><span class="label">Type</span><span class="value">{TRACK_TYPE_LABELS[track.Type] ?? track.Type}</span></div>
								<div class="detail-item"><span class="label">Distance</span><span class="value">{track.Distance}</span></div>
							</div>
							<div class="track-actions">
								<button class="track-btn" onclick={() => (resettingTrack = track.id)}>Reset Lap History</button>
								<button class="track-btn danger" onclick={() => (deletingTrack = track.id)}>Delete Track</button>
							</div>
						{/if}
					</div>
				{:else}
					<div class="empty">No Tracks Created Yet</div>
				{/each}
			</div>
		{/if}
	</AppContainer>
{/if}

<Modal showing={savingTrack} title="Create New Track" acceptLabel="Save Track" onAccept={submitTrack} onClose={() => (savingTrack = false)}>
	<label class="field">
		<span>Name</span>
		<input bind:value={trackName} maxlength={32} />
	</label>
	<label class="field">
		<span>Type</span>
		<Dropdown
			bind:value={trackType}
			options={[
				{ value: 'laps', label: 'Laps' },
				{ value: 'p2p', label: 'Point To Point' },
			]}
		/>
	</label>
</Modal>

<Confirm showing={deletingTrack !== null} title="Delete Track?" onAccept={confirmDeleteTrack} onDeny={() => (deletingTrack = null)} />
<Confirm showing={resettingTrack !== null} title="Reset Track History?" onAccept={confirmResetTrack} onDeny={() => (resettingTrack = null)} />

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

	.unauthorized {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		font-size: 22px;
		font-weight: 700;
		color: var(--color-text-muted);
		padding: 20px;
	}

	.welcome {
		width: 100%;
		padding: 10px 14px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		font-size: 13px;
		color: var(--color-text-alt);
	}

	.welcome span {
		color: var(--color-primary);
		font-weight: 700;
	}

	.empty {
		text-align: center;
		margin-top: 25%;
		font-size: 16px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.empty.small {
		margin-top: 10px;
		font-size: 13px;
	}

	.race-list {
		display: flex;
		flex-direction: column;
	}

	.race-row {
		width: 100%;
		background: none;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding: 10px 14px;
		display: flex;
		align-items: center;
		gap: 12px;
		cursor: pointer;
		text-align: left;
		color: var(--color-text);
	}

	.race-row:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.race-class {
		flex-shrink: 0;
		width: 32px;
		text-align: center;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-primary);
	}

	.race-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: 2px;
	}

	.race-name {
		font-size: 14px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.race-sub {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.detail-section {
		padding: 10px 16px;
	}

	.racers-section {
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.section-header {
		text-align: center;
		font-size: 13px;
		font-weight: 700;
		color: var(--color-text-alt);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 6px 0 10px;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		padding: 6px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.label {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.value {
		font-size: 14px;
		color: var(--color-text);
	}

	.racer-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 0;
	}

	.racer-place {
		flex-shrink: 0;
		width: 40px;
		text-align: center;
		font-size: 16px;
		font-weight: 700;
		color: var(--color-primary);
	}

	.racer-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.racer-name {
		font-size: 14px;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.racer-sub {
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	.form {
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.field-row {
		display: flex;
		gap: 10px;
	}

	.field-row .field {
		flex: 1;
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
		outline: none;
		font-family: inherit;
	}

	.field input:disabled {
		opacity: 0.5;
	}

	.track-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px;
	}

	.track-card {
		background: var(--color-bg-panel);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.track-summary {
		width: 100%;
		background: none;
		border: none;
		padding: 12px 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
		color: var(--color-text);
		gap: 10px;
	}

	.track-main {
		display: flex;
		flex-direction: column;
		gap: 2px;
		text-align: left;
	}

	.track-name {
		font-size: 14px;
	}

	.track-sub {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.track-details {
		padding: 0 14px 8px;
	}

	.track-actions {
		display: flex;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.track-btn {
		flex: 1;
		background: none;
		border: none;
		padding: 10px;
		font-size: 12px;
		color: var(--color-warning, #f9a825);
		cursor: pointer;
	}

	.track-btn.danger {
		color: var(--color-error-light, var(--color-error));
	}

	.track-btn:hover {
		background: rgba(255, 255, 255, 0.05);
	}
</style>
