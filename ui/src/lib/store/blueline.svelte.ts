import type { PDRace, PDRacer } from '../types';

export const bluelineState = $state({
	races: {} as Record<string, PDRace>,
	inRace: false,
	creatorActive: false,
});

export function handleBluelineMessage(type: string, data: Record<string, unknown>) {
	switch (type) {
		case 'PD_EVENT_SPAWN':
			bluelineState.races = (data.races as Record<string, PDRace> | null) ?? {};
			bluelineState.inRace = false;
			break;
		case 'PD_ADD_PENDING_RACE': {
			const race = data as unknown as PDRace;
			bluelineState.races = { ...bluelineState.races, [String(race.id)]: race };
			break;
		}
		case 'PD_CANCEL_RACE': {
			const id = String(data.race);
			const existing = bluelineState.races[id];
			if (existing) bluelineState.races = { ...bluelineState.races, [id]: { ...existing, state: -1 } };
			if (data.myRace) bluelineState.inRace = false;
			break;
		}
		case 'PD_STATE_UPDATE': {
			const id = String(data.race);
			const existing = bluelineState.races[id];
			if (existing) bluelineState.races = { ...bluelineState.races, [id]: { ...existing, state: data.state as PDRace['state'] } };
			break;
		}
		case 'PD_JOIN_RACE': {
			const id = String(data.race);
			const existing = bluelineState.races[id];
			const racer = data.racer as string;
			if (existing) bluelineState.races = { ...bluelineState.races, [id]: { ...existing, racers: { ...existing.racers, [racer]: {} as PDRacer } } };
			break;
		}
		case 'PD_LEAVE_RACE': {
			const id = String(data.race);
			const existing = bluelineState.races[id];
			const racer = data.racer as string;
			if (existing) {
				const racers = { ...existing.racers };
				delete racers[racer];
				bluelineState.races = { ...bluelineState.races, [id]: { ...existing, racers } };
			}
			break;
		}
		case 'PD_FINISH_RACE': {
			const id = String(data.id);
			bluelineState.races = { ...bluelineState.races, [id]: data.race as PDRace };
			break;
		}
		case 'PD_I_RACE':
			bluelineState.inRace = Boolean(data.state);
			break;
		case 'PD_RACE_STATE_CHANGE':
			bluelineState.creatorActive = data.state != null;
			break;
	}
}

// local-only mutation after a successful CreateRacePD/JoinRacePD Nui call, server is the source of
// truth on the next push - same reasoning as every other app's addLocalX helpers
export function addLocalRace(race: PDRace) {
	bluelineState.races = { ...bluelineState.races, [String(race.id)]: race };
}

// CreateTrackPD's success is only ever reflected locally - the Lua side only ever pushes the *end* of
// the creator flow (PD_RACE_STATE_CHANGE with state=null), never the start
export function setCreatorActive(active: boolean) {
	bluelineState.creatorActive = active;
}
