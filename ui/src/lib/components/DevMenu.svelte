<!-- dev-only helper panel, only mounted when import.meta.env.DEV -->
<script lang="ts">
	import { applyMessage } from '../messages';
	import { dataState } from '../store/data.svelte';
	import { shellState } from '../store/shell.svelte';

	let open = $state(false);

	// lets you get into the phone-closed state in dev without a real Lua push
	function togglePhoneVisible() {
		applyMessage(shellState.visible ? 'PHONE_NOT_VISIBLE' : 'PHONE_VISIBLE', {});
	}

	const SAMPLE_TITLES = [
		['New Message', 'You have a new text message'],
		['Missed Call', 'You missed a call'],
		['Employment Offer', "You've received a job offer"],
		['Low Balance', 'Your account balance is running low'],
		['New Follower', 'Someone started following you'],
	];

	let counter = 0;

	function randomApp(): string {
		const names = Object.keys(dataState.appRegistry);
		if (names.length === 0) return 'messages';
		return names[Math.floor(Math.random() * names.length)];
	}

	function pushNotification() {
		counter++;
		const [title, description] = SAMPLE_TITLES[Math.floor(Math.random() * SAMPLE_TITLES.length)];
		applyMessage('NOTIF_ADD', {
			notification: {
				id: `dev-${Date.now()}-${counter}`,
				title,
				description,
				time: Math.floor(Date.now() / 1000),
				duration: 6000,
				app: randomApp(),
				show: true,
			},
		});
	}

	function pushBatch() {
		for (let i = 0; i < 3; i++) pushNotification();
	}

	function pushPopupWithActions() {
		counter++;
		applyMessage('NOTIF_ADD', {
			notification: {
				id: `dev-popup-${Date.now()}-${counter}`,
				title: 'Employment Offer',
				description: 'Tap to accept or decline',
				time: Math.floor(Date.now() / 1000),
				duration: -1,
				app: randomApp(),
				action: { accept: 'Dev:Accept', cancel: 'Dev:Cancel' },
				show: true,
			},
		});
	}

	function clearAll() {
		applyMessage('NOTIF_DISMISS_ALL', {});
	}

	// simulates the redline/blueline live-race message sequence for previewing RaceHud
	let raceTimers: ReturnType<typeof setTimeout>[] = [];

	function clearRaceTimers() {
		raceTimers.forEach(clearTimeout);
		raceTimers = [];
	}

	function startTestRace() {
		clearRaceTimers();
		applyMessage('RACE_START', { totalCheckpoints: 4, totalLaps: 3, track: { Type: 'circuit' } });
		raceTimers.push(setTimeout(() => applyMessage('RACE_CP', { cp: 2 }), 1500));
		raceTimers.push(setTimeout(() => applyMessage('RACE_CP', { cp: 3 }), 3000));
		raceTimers.push(setTimeout(() => applyMessage('RACE_CP', { cp: 4 }), 4500));
		raceTimers.push(setTimeout(() => applyMessage('RACE_LAP', {}), 6000));
		raceTimers.push(setTimeout(() => applyMessage('RACE_CP', { cp: 2 }), 7500));
	}

	function startDnfCountdown() {
		applyMessage('DNF_START', { time: 10 });
	}

	function failRace() {
		clearRaceTimers();
		applyMessage('RACE_DNF', {});
	}

	function endTestRace() {
		clearRaceTimers();
		applyMessage('RACE_END', {});
	}
</script>

<div class="dev-menu">
	<button class="toggle" onclick={() => (open = !open)}>DEV</button>
	{#if open}
		<div class="panel">
			<button onclick={togglePhoneVisible}>{shellState.visible ? 'Close Phone (Show Peek)' : 'Open Phone'}</button>
			<button onclick={pushNotification}>Push Notification</button>
			<button onclick={pushBatch}>Push 3 Notifications</button>
			<button onclick={pushPopupWithActions}>Push Popup (Accept/Cancel)</button>
			<button onclick={clearAll}>Clear All Notifications</button>
			<button onclick={startTestRace}>Start Test Race</button>
			<button onclick={startDnfCountdown}>Start DNF Countdown</button>
			<button onclick={failRace}>Fail Race (DNF)</button>
			<button onclick={endTestRace}>End Race</button>
		</div>
	{/if}
</div>

<style>
	/* page defaults to pointer-events:none, this panel is outside the phone's tree so it has to opt back in */
	.dev-menu {
		position: fixed;
		top: 8px;
		left: 8px;
		z-index: 99999;
		font-family: monospace;
		pointer-events: auto;
	}

	.toggle {
		background: #b40000;
		color: #fff;
		border: none;
		border-radius: 4px;
		padding: 6px 10px;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		letter-spacing: 0.05em;
	}

	.panel {
		margin-top: 4px;
		background: rgba(20, 20, 20, 0.95);
		border: 1px solid #444;
		border-radius: 6px;
		padding: 6px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 200px;
	}

	.panel button {
		background: #2a2a2a;
		color: #fff;
		border: 1px solid #444;
		border-radius: 4px;
		padding: 6px 8px;
		font-size: 11px;
		text-align: left;
		cursor: pointer;
	}

	.panel button:hover {
		background: #3a3a3a;
	}
</style>
