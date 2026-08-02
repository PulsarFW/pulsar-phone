<!-- floating live-race HUD (checkpoint/lap/DNF countdown), only rendered on the home screen -->
<script lang="ts">
	import { trackState } from '../store/track.svelte';

	let now = $state(Date.now());
	$effect(() => {
		if (!trackState.show || trackState.dnf) return;
		const i = setInterval(() => (now = Date.now()), 100);
		return () => clearInterval(i);
	});

	function formatElapsed(ms: number): string {
		const clamped = Math.max(0, ms);
		const cs = Math.floor((clamped % 1000) / 10);
		const totalSeconds = Math.floor(clamped / 1000);
		const s = totalSeconds % 60;
		const m = Math.floor(totalSeconds / 60) % 60;
		const h = Math.floor(totalSeconds / 3600);
		const pad = (n: number) => String(n).padStart(2, '0');
		return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}.${pad(cs)}` : `${pad(m)}:${pad(s)}.${pad(cs)}`;
	}

	const totalTime = $derived(formatElapsed(now - trackState.raceStartedAt));
	const currentLapTime = $derived(formatElapsed(now - trackState.lapStartedAt));
	const dnfRemaining = $derived(trackState.dnfEndsAt != null ? formatElapsed(trackState.dnfEndsAt - now) : null);
	const fastestLap = $derived.by(() => {
		if (trackState.laps.length === 0) return null;
		return Math.min(...trackState.laps.map((l) => l.durationMs));
	});
</script>

{#if trackState.show}
	<div class="race-hud">
		<div class="race-header">Active Race</div>
		{#if trackState.dnf}
			<div class="race-dnf-msg">You DNF'd, Better Luck Next Time</div>
		{:else}
			{#if dnfRemaining !== null}
				<div class="race-row">
					<span class="race-label">DNF</span>
					<span class="race-value">{dnfRemaining}</span>
				</div>
			{/if}
			{#if trackState.isLaps}
				<div class="race-row">
					<span class="race-label">Lap</span>
					<span class="race-value">{trackState.lap} / {trackState.totalLaps}</span>
				</div>
			{/if}
			<div class="race-row">
				<span class="race-label">Checkpoint</span>
				<span class="race-value">{trackState.checkpoint} / {trackState.totalCheckpoints}</span>
			</div>
			{#if trackState.isLaps}
				<div class="race-row">
					<span class="race-label">Current Lap</span>
					<span class="race-value">{currentLapTime}</span>
				</div>
				<div class="race-row">
					<span class="race-label">Fastest Lap</span>
					<span class="race-value">{fastestLap != null ? formatElapsed(fastestLap) : '--:--.--'}</span>
				</div>
			{/if}
			<div class="race-row">
				<span class="race-label">Total Time</span>
				<span class="race-value">{totalTime}</span>
			</div>
		{/if}
	</div>
{/if}

<style>
	.race-hud {
		background: rgba(24, 25, 30, 0.92);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.race-header {
		font-size: 10.5px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-text-muted);
		padding-bottom: 5px;
		margin-bottom: 2px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.race-dnf-msg {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-error-light, var(--color-error));
	}

	.race-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}

	.race-label {
		font-size: 13px;
		color: var(--color-text-alt);
	}

	.race-value {
		font-size: 15px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-text);
	}
</style>
