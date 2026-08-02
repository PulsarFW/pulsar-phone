<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import Confirm from '../../primitives/Confirm.svelte';
	import Dropdown from '../../primitives/Dropdown.svelte';
	import { dataState } from '../../store/data.svelte';
	import { redlineState, addLocalRedlineRace, setRedlineCreatorActive, removeRedlineInvite } from '../../store/redline.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { PDTrack } from '../../types';

	const ACCESS_TYPES = [
		{ value: 'public', label: 'Public Join', disabled: false },
		{ value: 'team', label: 'Team Only', disabled: true },
		{ value: 'invite', label: 'Invite Only', disabled: false },
	];
	const GHOST_TYPES = [
		{ value: 'none', label: 'No Phasing' },
		{ value: 'timed', label: 'Ghosted For Period Of Time' },
		{ value: 'checkpoints', label: 'Ghosted For # Of Checkpoints' },
	];
	const CLASSES = ['D', 'C', 'B', 'A', 'S', 'All'];
	const TRACK_TYPE_LABELS: Record<string, string> = { laps: 'Laps', p2p: 'Point To Point' };

	const view = $derived.by(() => {
		if (navState.route === 'completed') return 'completed';
		if (navState.route === 'new') return 'new';
		if (navState.route === 'admin') return 'admin';
		if (navState.route === 'invites') return 'invites';
		if (navState.route === 'tracks' || navState.route.startsWith('tracks/')) return 'tracks';
		if (navState.route.startsWith('view/')) return 'view';
		if (navState.route.startsWith('profile/')) return 'profile';
		return 'list';
	});
	const targetId = $derived(view === 'view' ? navState.route.slice('view/'.length) : null);

	const player = $derived(dataState.player);
	const onDuty = $derived(dataState.onDuty);
	const alias = $derived(player?.Profiles?.redline);
	const authorized = $derived(Boolean(alias) && onDuty !== 'police');
	const canCreate = $derived(Boolean(player?.PhonePermissions?.redline?.create));
	const tracks = $derived((dataState.extra.tracks as PDTrack[] | undefined) ?? []);
	const mySid = $derived(player?.SID);

	function trackFor(id: number): PDTrack | undefined {
		return tracks.find((t) => t.id === id);
	}

	const validInvites = $derived(redlineState.invites.filter((i) => Boolean(redlineState.races[String(i.id)])));

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

	function currencyFormat(n: number): string {
		return `$${n.toLocaleString('en-US')}`;
	}

	const pendingRaces = $derived(
		Object.values(redlineState.races)
			.filter((r) => r.state !== -1 && r.state !== 2)
			.sort((a, b) => (b.time ?? 0) - (a.time ?? 0)),
	);
	const recentRaces = $derived(
		Object.values(redlineState.races)
			.filter((r) => (r.state === -1 || r.state === 2) && trackFor(r.track))
			.sort((a, b) => (b.time ?? 0) - (a.time ?? 0)),
	);
	const iHostAnActiveRace = $derived(Object.values(redlineState.races).some((r) => r.host_id === mySid && r.state !== -1 && r.state !== 2));
	const viewedRace = $derived(targetId !== null ? redlineState.races[targetId] : undefined);
	const viewedTrack = $derived(viewedRace ? trackFor(viewedRace.track) : undefined);
	const activePhaseLabel = $derived(GHOST_TYPES.find((g) => g.value === viewedRace?.phasing)?.label);

	// welcome / alias registration
	let registering = $state(false);
	let newAlias = $state('');
	async function submitAlias() {
		if (!newAlias.trim()) return;
		registering = true;
		const ok = await Nui.updateProfile('redline', { name: newAlias.trim(), picture: '' });
		registering = false;
		if (ok && player) {
			player.Profiles = { ...(player.Profiles ?? {}), redline: { sid: player.SID, app: 'redline', name: newAlias.trim(), picture: '' } };
			pushAlert('Alias Created');
		} else {
			pushAlert('Unable To Create Alias', 'error');
		}
	}

	// new race form
	let formName = $state('');
	let formTrack = $state<number | null>(null);
	let formAccess = $state('public');
	let formBuyin = $state('0');
	let formLaps = $state(1);
	let formDnfStart = $state('3');
	let formDnfTime = $state('120');
	let formCountdown = $state('8');
	let formPhasing = $state('none');
	let formPhasingAdv = $state(0);
	let formClass = $state('All');

	$effect(() => {
		if (view === 'new') {
			formName = '';
			formTrack = tracks.length > 0 ? tracks[0].id : null;
			formAccess = 'public';
			formBuyin = '0';
			formLaps = 1;
			formDnfStart = '3';
			formDnfTime = '120';
			formCountdown = '8';
			formPhasing = 'none';
			formPhasingAdv = 0;
			formClass = 'All';
		}
	});

	async function submitCreate() {
		if (!formName.trim() || !alias || formTrack === null) return;
		const res = await Nui.redlineCreateRace({
			name: formName.trim(),
			host: alias.name,
			track: formTrack,
			buyin: formBuyin,
			laps: formLaps,
			dnf_start: formDnfStart,
			dnf_time: formDnfTime,
			countdown: formCountdown,
			class: formClass,
			access: formAccess,
			phasing: formPhasing,
			phasingAdv: formPhasingAdv,
		});
		if (res && !('failed' in res)) {
			addLocalRedlineRace(res);
			pushAlert('Race Created');
			navigateToApp('redline', `view/${res.id}`);
		} else {
			pushAlert(res && 'message' in res ? res.message : 'Unable To Create Race', 'error');
		}
	}

	// race view actions
	async function joinRace() {
		if (!viewedRace) return;
		const res = await Nui.redlineJoinRace(viewedRace.id);
		pushAlert(res ? 'Joined Race' : 'Unable To Join Race', res ? 'info' : 'error');
	}

	async function leaveRace() {
		if (!viewedRace) return;
		const ok = await Nui.redlineLeaveRace(viewedRace.id);
		if (ok) {
			pushAlert('Left Race');
			navigateToApp('redline');
		} else {
			pushAlert('Unable To Leave Race', 'error');
		}
	}

	async function cancelRace() {
		if (!viewedRace) return;
		const ok = await Nui.redlineCancelRace(viewedRace.id);
		if (ok) {
			pushAlert('Cancelled Race');
			navigateToApp('redline');
		} else {
			pushAlert('Unable To Cancel Race', 'error');
		}
	}

	async function startRace() {
		if (!viewedRace) return;
		const res = await Nui.redlineStartRace(viewedRace.id);
		if (res === true) pushAlert('Starting Race');
		else pushAlert(res && typeof res === 'object' ? res.message : 'Unable To Start Race', 'error');
	}

	async function endRace() {
		if (!viewedRace) return;
		const ok = await Nui.redlineEndRace(viewedRace.id);
		if (ok) {
			pushAlert('Event Ended');
			navigateToApp('redline');
		} else {
			pushAlert('Unable To End Event', 'error');
		}
	}

	let removingRacer = $state<string | null>(null);
	async function confirmRemoveRacer() {
		if (!viewedRace || !removingRacer) return;
		const name = removingRacer;
		removingRacer = null;
		const ok = await Nui.redlineRemoveFromRace(viewedRace.id, name);
		pushAlert(ok ? `${name} Removed From Event` : 'Unable To Remove From Event', ok ? 'info' : 'error');
	}

	let inviting = $state(false);
	let inviteAlias = $state('');
	async function submitInvite() {
		if (!viewedRace || !inviteAlias.trim()) return;
		const ok = await Nui.redlineSendInvite(viewedRace.id, inviteAlias.trim());
		pushAlert(ok ? 'Event Invite Sent' : 'Unable To Send Invite', ok ? 'info' : 'error');
		inviting = false;
		inviteAlias = '';
	}

	let viewingWinnings = $state<{ name: string; reward: { cash?: number; coin?: string; crypto?: number } } | null>(null);

	// invites screen
	async function acceptInvite(id: string | number) {
		const ok = await Nui.redlineAcceptInvite(id);
		if (ok) {
			removeRedlineInvite(id);
			pushAlert('Event Invite Accepted');
			navigateToApp('redline', `view/${id}`);
		} else {
			pushAlert('Unable To Accept Event Invite', 'error');
		}
	}

	async function declineInvite(id: string | number) {
		const ok = await Nui.redlineDeclineInvite(id);
		if (ok) {
			removeRedlineInvite(id);
			pushAlert('Event Invite Declined');
		} else {
			pushAlert('Unable To Decline Event Invite', 'error');
		}
	}

	// tracks (leaderboard) screen
	const trackId = $derived(navState.route.startsWith('tracks/') ? Number(navState.route.slice('tracks/'.length)) : null);
	let selectedTrackId = $state<number | null>(null);
	$effect(() => {
		if (view === 'tracks') selectedTrackId = trackId ?? (tracks.length > 0 ? tracks[0].id : null);
	});
	const selectedTrackHistory = $derived(trackFor(selectedTrackId ?? -1)?.Fastest ?? []);

	// admin: track creator + track management
	let savingTrack = $state(false);
	let trackName = $state('');
	let trackType = $state<'laps' | 'p2p'>('laps');
	let expandedTrack = $state<number | null>(null);
	let deletingTrack = $state<number | null>(null);
	let resettingTrack = $state<number | null>(null);

	async function startCreator() {
		const ok = await Nui.redlineCreateTrack();
		if (ok) {
			setRedlineCreatorActive(true);
			pushAlert('Creator Started');
		} else {
			pushAlert('Unable To Start Creator', 'error');
		}
	}

	async function cancelCreator() {
		await Nui.redlineStopCreator();
		setRedlineCreatorActive(false);
	}

	async function submitTrack() {
		if (!trackName.trim()) return;
		const ok = await Nui.redlineFinishCreator(trackName.trim(), trackType);
		pushAlert(ok ? 'Track Created' : 'Unable To Create Track', ok ? 'info' : 'error');
		savingTrack = false;
		trackName = '';
	}

	async function confirmDeleteTrack() {
		if (deletingTrack === null) return;
		const ok = await Nui.redlineDeleteTrack(deletingTrack);
		pushAlert(ok ? 'Track Deleted' : 'Unable To Delete Track', ok ? 'info' : 'error');
		deletingTrack = null;
		expandedTrack = null;
	}

	async function confirmResetTrack() {
		if (resettingTrack === null) return;
		const ok = await Nui.redlineResetTrackHistory(resettingTrack);
		pushAlert(ok ? 'Track History Reset' : 'Unable To Reset Track History', ok ? 'info' : 'error');
		resettingTrack = null;
	}
</script>

{#snippet unauthorized()}
	<div class="unauthorized">Not Authorized</div>
{/snippet}

{#snippet welcome()}
	<div class="welcome-screen">
		<div class="welcome-title">Welcome Racer</div>
		<p class="welcome-sub">Set your alias to get started</p>
		<div class="welcome-form">
			<input class="welcome-input" placeholder="Alias" bind:value={newAlias} maxlength={32} disabled={registering} />
			<button class="welcome-btn" onclick={submitAlias} disabled={registering || !newAlias.trim()} aria-label="Confirm"><Icon name="check" size="16px" /></button>
		</div>
		<p class="welcome-note">Think hard, you may not change this</p>
	</div>
{/snippet}

{#snippet raceRow(race: (typeof pendingRaces)[number])}
	{@const track = trackFor(race.track)}
	<button class="race-row" onclick={() => navigateToApp('redline', `view/${race.id}`)}>
		<span class="race-class">{race.class !== 'All' ? race.class : '-'}</span>
		<span class="race-main">
			<span class="race-name">{race.name}</span>
			<span class="race-sub">{track?.Name ?? 'Unknown Track'} <small>({Object.keys(race.racers).length} Racers)</small></span>
		</span>
		<Icon name="chevron-right" size="14px" />
	</button>
{/snippet}

{#if view === 'list' || view === 'completed'}
	<AppContainer appId="redline" title={view === 'completed' ? 'Redline - Recent Races' : 'Redline - Pending Races'} useAppColor={true}>
		{#snippet actions()}
			{#if authorized}
				{#if validInvites.length > 0}
					<button class="header-action" onclick={() => navigateToApp('redline', 'invites')} aria-label="Invites">
						<span class="badge">{validInvites.length}</span>
						<Icon name="envelope" size="20px" />
					</button>
				{/if}
				<button class="header-action" onclick={() => navigateToApp('redline', view === 'completed' ? '' : 'completed')} aria-label="Toggle View">
					<Icon name={view === 'completed' ? 'calendar-days' : 'clock-rotate-left'} size="20px" />
				</button>
				<button class="header-action" onclick={() => navigateToApp('redline', 'tracks')} aria-label="Leaderboards"><Icon name="trophy" size="20px" /></button>
				{#if !iHostAnActiveRace}
					<button class="header-action" onclick={() => navigateToApp('redline', 'new')} aria-label="New Race"><Icon name="plus" size="20px" /></button>
				{/if}
				{#if canCreate}
					<button class="header-action" onclick={() => navigateToApp('redline', 'admin')} aria-label="Admin"><Icon name="shield-halved" size="20px" /></button>
				{/if}
			{/if}
		{/snippet}
		{#if !alias}
			{@render welcome()}
		{:else if onDuty === 'police'}
			{@render unauthorized()}
		{:else}
			<div class="welcome-banner">Welcome Back <span>{alias.name}</span></div>
			<div class="race-list">
				{#each view === 'completed' ? recentRaces : pendingRaces as race (race.id)}
					{@render raceRow(race)}
				{:else}
					<div class="empty">{view === 'completed' ? 'No Recent Races' : 'No Pending Races'}</div>
				{/each}
			</div>
		{/if}
	</AppContainer>
{:else if view === 'invites'}
	<AppContainer appId="redline" title="Redline - Event Invites" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('redline')} aria-label="Back"><Icon name="arrow-left" size="20px" /></button>
		{/snippet}
		{#if validInvites.length === 0}
			<div class="empty">No Pending Event Invites</div>
		{:else}
			<div class="race-list">
				{#each validInvites as invite (invite.id)}
					{@const race = redlineState.races[String(invite.id)]}
					<div class="invite-row">
						<span class="race-main"><span class="race-name">{race?.name ?? 'Event'}</span></span>
						<button class="icon-btn" onclick={() => declineInvite(invite.id)} aria-label="Decline"><Icon name="xmark" size="14px" /></button>
						<button class="icon-btn" onclick={() => acceptInvite(invite.id)} aria-label="Accept"><Icon name="check" size="14px" /></button>
					</div>
				{/each}
			</div>
		{/if}
	</AppContainer>
{:else if view === 'new'}
	<AppContainer appId="redline" title="New Event" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('redline')} aria-label="Cancel"><Icon name="xmark" size="20px" /></button>
			<button class="header-action" onclick={submitCreate} disabled={!formName.trim() || formTrack === null} aria-label="Save"><Icon name="floppy-disk" size="20px" /></button>
		{/snippet}
		{#if !authorized}
			{@render unauthorized()}
		{:else}
			<div class="form">
				<label class="field">
					<span>Event Name</span>
					<input bind:value={formName} maxlength={32} />
				</label>
				<label class="field">
					<span>Access</span>
					<Dropdown bind:value={formAccess} options={ACCESS_TYPES} />
				</label>
				<label class="field">
					<span>Host</span>
					<input value={alias?.name} disabled />
				</label>
				<label class="field">
					<span>Track</span>
					<Dropdown bind:value={formTrack} options={tracks.map((track) => ({ value: track.id, label: `${track.id} - ${track.Name}` }))} />
				</label>
				<label class="field">
					<span># Of Laps</span>
					<input type="number" min="1" bind:value={formLaps} disabled={trackFor(formTrack ?? -1)?.Type === 'p2p'} />
				</label>
				<div class="field-row">
					<label class="field">
						<span>Countdown</span>
						<input type="number" bind:value={formCountdown} />
					</label>
					<label class="field">
						<span>Buy In</span>
						<input type="number" bind:value={formBuyin} />
					</label>
				</div>
				{#if Number(formBuyin) > 0}
					<div class="warning-box">Cash is not automatically gathered - as host you must collect buy-ins and pay out winners yourself.</div>
				{/if}
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
				<label class="field">
					<span>Phasing</span>
					<Dropdown bind:value={formPhasing} options={GHOST_TYPES} />
				</label>
				{#if formPhasing !== 'none'}
					<label class="field">
						<span>{formPhasing === 'timed' ? 'Time (Seconds)' : '# Of Checkpoints'}</span>
						<input type="number" min={formPhasing === 'timed' ? 3 : 1} max={formPhasing === 'timed' ? 60 : 10} bind:value={formPhasingAdv} />
					</label>
				{/if}
				<label class="field">
					<span>Vehicle Class</span>
					<Dropdown bind:value={formClass} options={CLASSES.map((c) => ({ value: c, label: c === 'All' ? 'All Classes' : `${c} Class` }))} />
				</label>
			</div>
		{/if}
	</AppContainer>
{:else if view === 'view'}
	<AppContainer appId="redline" title={viewedRace?.name ?? 'Event'} useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('redline')} aria-label="Back"><Icon name="arrow-left" size="20px" /></button>
			{#if viewedRace}
				{#if viewedRace.host_id === mySid && viewedRace.state === 0 && viewedRace.access === 'invite'}
					<button class="header-action" onclick={() => (inviting = true)} aria-label="Invite Racer"><Icon name="envelope" size="20px" /></button>
				{/if}
				{#if viewedRace.host_id === mySid}
					{#if viewedRace.state === 0}
						<button class="header-action" onclick={cancelRace} aria-label="Cancel Race"><Icon name="xmark" size="20px" /></button>
						<button class="header-action" onclick={startRace} aria-label="Start Race"><Icon name="play" size="20px" /></button>
					{:else if viewedRace.state !== 2}
						<button class="header-action" onclick={endRace} aria-label="End Race"><Icon name="ban" size="20px" /></button>
					{/if}
				{:else if !redlineState.inRace && viewedRace.state === 0 && alias && !viewedRace.racers[alias.name] && viewedRace.access === 'public'}
					<button class="header-action" onclick={joinRace} aria-label="Join Race"><Icon name="right-to-bracket" size="20px" /></button>
				{:else if (viewedRace.state === 0 || viewedRace.state === 1) && alias && viewedRace.racers[alias.name]}
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
				<div class="section-header">Event #{viewedRace.id} Details</div>
				<button class="detail-item clickable" onclick={() => navigateToApp('redline', `profile/${viewedRace.host}`)}>
					<span class="label">Host</span><span class="value">{viewedRace.host}</span>
				</button>
				<div class="detail-item">
					<span class="label">State</span>
					<span class="value">
						{#if viewedRace.state === -1}Cancelled{:else if viewedRace.state === 0}Setting Up{:else if viewedRace.state === 1}In Progress{:else if viewedRace.state === 2}Finished{/if}
					</span>
				</div>
				<div class="detail-item"><span class="label">Buy In</span><span class="value">{viewedRace.buyin && viewedRace.buyin > 0 ? currencyFormat(viewedRace.buyin) : 'None'}</span></div>
				<button class="detail-item clickable" onclick={() => navigateToApp('redline', `tracks/${viewedRace.track}`)}>
					<span class="label">Track</span><span class="value">{viewedTrack ? `${viewedTrack.Name} (${viewedTrack.Distance})` : 'Unknown'}</span>
				</button>
				<div class="detail-item"><span class="label"># Of Laps</span><span class="value">{viewedRace.laps}</span></div>
				<div class="detail-item"><span class="label">Race Phasing</span><span class="value">{activePhaseLabel ?? 'Disabled'}</span></div>
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
							{#if racer.reward}
								<button class="icon-btn" onclick={() => (viewingWinnings = { name, reward: racer.reward ?? {} })} aria-label="Winnings"><Icon name="dollar-sign" size="14px" /></button>
							{/if}
							<button class="icon-btn" onclick={() => navigateToApp('redline', `profile/${name}`)} aria-label="Profile"><Icon name="user" size="14px" /></button>
						</div>
					{/each}
					{#each dnf as [name] (name)}
						<div class="racer-row">
							<span class="racer-place">-</span>
							<span class="racer-main"><span class="racer-name">{name}</span></span>
							<button class="icon-btn" onclick={() => navigateToApp('redline', `profile/${name}`)} aria-label="Profile"><Icon name="user" size="14px" /></button>
						</div>
					{/each}
				{:else}
					{#each Object.entries(viewedRace.racers) as [name, racer] (name)}
						<div class="racer-row">
							<span class="racer-place">-</span>
							<span class="racer-main"><span class="racer-name">{name}</span></span>
							{#if viewedRace.host_id === mySid && racer.sid !== mySid}
								<button class="icon-btn" onclick={() => (removingRacer = name)} aria-label="Remove"><Icon name="xmark" size="14px" /></button>
							{/if}
							<button class="icon-btn" onclick={() => navigateToApp('redline', `profile/${name}`)} aria-label="Profile"><Icon name="user" size="14px" /></button>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</AppContainer>
{:else if view === 'tracks'}
	<AppContainer appId="redline" title="Redline - Fastest Laps" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('redline')} aria-label="Home"><Icon name="house" size="20px" /></button>
		{/snippet}
		{#if !alias}
			{@render welcome()}
		{:else if onDuty === 'police'}
			{@render unauthorized()}
		{:else if tracks.length === 0}
			<div class="empty">No Tracks Exist</div>
		{:else}
			<div class="track-select">
				<label class="field">
					<span>Track</span>
					<Dropdown bind:value={selectedTrackId} options={tracks.map((track) => ({ value: track.id, label: track.Name }))} />
				</label>
			</div>
			{#if selectedTrackHistory.length === 0}
				<div class="empty small">Track Has No Lap Records</div>
			{:else}
				<div class="race-list">
					{#each selectedTrackHistory as lap, i (i)}
						<button class="race-row" onclick={() => navigateToApp('redline', `profile/${lap.alias}`)}>
							<span class="race-class">#{i + 1}</span>
							<span class="race-main">
								<span class="race-name">{lap.alias} - {lap.car}</span>
								<span class="race-sub">Laptime: {formatDuration(lap.lap_end - lap.lap_start)}</span>
							</span>
							<Icon name="chevron-right" size="14px" />
						</button>
					{/each}
				</div>
			{/if}
		{/if}
	</AppContainer>
{:else if view === 'profile'}
	<AppContainer appId="redline" title="Racer Profile" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('redline')} aria-label="Back"><Icon name="arrow-left" size="20px" /></button>
		{/snippet}
		<div class="empty">Racer Profiles Coming Soon</div>
	</AppContainer>
{:else if view === 'admin'}
	<AppContainer appId="redline" title="Redline Admin" useAppColor={true}>
		{#snippet actions()}
			{#if authorized && canCreate}
				{#if !redlineState.creatorActive}
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
							<div class="detail-item"><span class="label">Type</span><span class="value">{TRACK_TYPE_LABELS[track.Type] ?? track.Type}</span></div>
							<div class="detail-item"><span class="label">Distance</span><span class="value">{track.Distance}</span></div>
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

<Modal showing={inviting} title="Invite Racer To Event" acceptLabel="Send Invite" onAccept={submitInvite} onClose={() => (inviting = false)}>
	<label class="field">
		<span>Alias</span>
		<input bind:value={inviteAlias} maxlength={32} />
	</label>
</Modal>

<Confirm showing={removingRacer !== null} title={`Remove ${removingRacer} From Event?`} onAccept={confirmRemoveRacer} onDeny={() => (removingRacer = null)} />

<Modal showing={viewingWinnings !== null} title={`${viewingWinnings?.name} Winnings`} acceptLabel="Close" onAccept={() => (viewingWinnings = null)} onClose={() => (viewingWinnings = null)}>
	{#if viewingWinnings?.reward.cash}<div class="detail-item"><span class="label">Cash</span><span class="value">${viewingWinnings.reward.cash}</span></div>{/if}
	{#if viewingWinnings?.reward.crypto}<div class="detail-item"><span class="label">Crypto</span><span class="value">{viewingWinnings.reward.crypto} ${viewingWinnings.reward.coin}</span></div>{/if}
</Modal>

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
	.header-action,
	.icon-btn {
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

	.welcome-screen {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 0 24px;
		gap: 8px;
	}

	.welcome-title {
		font-size: 26px;
		font-weight: 700;
		color: var(--color-primary);
	}

	.welcome-sub {
		font-size: 14px;
		color: var(--color-text-alt);
		margin: 4px 0 10px;
	}

	.welcome-form {
		display: flex;
		width: 100%;
		gap: 8px;
	}

	.welcome-input {
		flex: 1;
		background: transparent;
		border: var(--border-input);
		border-radius: var(--radius);
		padding: 9px 12px;
		font-size: 14px;
		color: var(--color-text);
		outline: none;
	}

	.welcome-btn {
		flex-shrink: 0;
		width: 38px;
		border-radius: var(--radius);
		border: none;
		background: var(--color-primary);
		color: #fff;
		cursor: pointer;
	}

	.welcome-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.welcome-note {
		font-size: 12.5px;
		color: var(--color-text-muted);
		margin-top: 10px;
		font-family: monospace;
	}

	.welcome-banner {
		width: 100%;
		padding: 10px 14px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		font-size: 13px;
		color: var(--color-text-alt);
	}

	.welcome-banner span {
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

	.race-row,
	.invite-row {
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
		width: 100%;
		background: none;
		border: none;
		display: flex;
		justify-content: space-between;
		padding: 6px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		color: var(--color-text);
		font-family: inherit;
	}

	.detail-item.clickable {
		cursor: pointer;
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
		gap: 8px;
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

	.warning-box {
		background: rgba(249, 168, 37, 0.15);
		border: 1px solid rgba(249, 168, 37, 0.4);
		color: #f9a825;
		font-size: 12px;
		padding: 8px 10px;
		border-radius: var(--radius);
	}

	.track-select {
		padding: 12px 14px 4px;
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
