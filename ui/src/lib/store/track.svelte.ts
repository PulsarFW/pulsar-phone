// live in-race HUD state, shared by redline.lua and blueline.lua's unprefixed RACE_* messages

export interface TrackLap {
	lapNumber: number;
	durationMs: number;
}

export const trackState = $state({
	show: false,
	isLaps: false,
	lap: 0,
	totalLaps: 0,
	checkpoint: 0,
	totalCheckpoints: 0,
	raceStartedAt: 0,
	lapStartedAt: 0,
	laps: [] as TrackLap[],
	dnf: false,
	dnfEndsAt: null as number | null,
});

function reset() {
	trackState.show = false;
	trackState.isLaps = false;
	trackState.lap = 0;
	trackState.totalLaps = 0;
	trackState.checkpoint = 0;
	trackState.totalCheckpoints = 0;
	trackState.raceStartedAt = 0;
	trackState.lapStartedAt = 0;
	trackState.laps = [];
	trackState.dnf = false;
	trackState.dnfEndsAt = null;
}

export function handleTrackMessage(type: string, data: Record<string, unknown>) {
	switch (type) {
		case 'RACE_START': {
			const track = data.track as { Type?: string } | undefined;
			const now = Date.now();
			trackState.show = true;
			trackState.dnf = false;
			trackState.dnfEndsAt = null;
			trackState.totalCheckpoints = Number(data.totalCheckpoints ?? 0);
			trackState.totalLaps = Number(data.totalLaps ?? 0);
			trackState.isLaps = track?.Type !== 'p2p';
			trackState.lap = 1;
			trackState.checkpoint = 1;
			trackState.raceStartedAt = now;
			trackState.lapStartedAt = now;
			trackState.laps = [];
			break;
		}
		case 'RACE_LAP': {
			const now = Date.now();
			if (trackState.lapStartedAt) {
				trackState.laps = [...trackState.laps, { lapNumber: trackState.lap, durationMs: now - trackState.lapStartedAt }];
			}
			trackState.lap += 1;
			trackState.checkpoint = 1;
			trackState.lapStartedAt = now;
			break;
		}
		case 'RACE_CP':
			trackState.checkpoint = Number(data.cp ?? trackState.checkpoint);
			break;
		case 'DNF_START':
			trackState.dnfEndsAt = Date.now() + Number(data.time ?? 0) * 1000;
			break;
		case 'RACE_DNF':
			trackState.dnf = true;
			trackState.dnfEndsAt = null;
			// shows the DNF message for 3s then auto-clears, no server round-trip needed
			setTimeout(reset, 3000);
			break;
		case 'RACE_END':
			reset();
			break;
	}
}
