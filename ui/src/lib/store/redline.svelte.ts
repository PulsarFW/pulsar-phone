// *_INVITE message types (not the generic SET_DATA bus). "tracks" itself IS pushed through the generic bus (plsr.Phone.Data:Set), so it lives in dataState.extra.tracks, not here
import type { RedlineInvite, RedlineRace, RedlineRacer } from '../types';

export const redlineState = $state({
	races: {} as Record<string, RedlineRace>,
	invites: [] as RedlineInvite[],
	inRace: false,
	creatorActive: false,
});

export function handleRedlineMessage(type: string, data: Record<string, unknown>) {
	switch (type) {
		case 'EVENT_SPAWN':
			redlineState.races = (data.races as Record<string, RedlineRace> | null) ?? {};
			redlineState.inRace = false;
			break;
		case 'ADD_PENDING_RACE': {
			const race = data.race as RedlineRace;
			redlineState.races = { ...redlineState.races, [String(race.id)]: race };
			break;
		}
		case 'CANCEL_RACE': {
			const id = String(data.race);
			const existing = redlineState.races[id];
			if (existing) redlineState.races = { ...redlineState.races, [id]: { ...existing, state: -1 } };
			if (data.myRace) redlineState.inRace = false;
			break;
		}
		case 'STATE_UPDATE': {
			const id = String(data.race);
			const existing = redlineState.races[id];
			if (existing) redlineState.races = { ...redlineState.races, [id]: { ...existing, state: data.state as RedlineRace['state'] } };
			break;
		}
		case 'JOIN_RACE': {
			const id = String(data.race);
			const existing = redlineState.races[id];
			const racer = data.racer as string;
			if (existing) redlineState.races = { ...redlineState.races, [id]: { ...existing, racers: { ...existing.racers, [racer]: (data.racerData as RedlineRacer) ?? {} } } };
			break;
		}
		case 'LEAVE_RACE': {
			const id = String(data.race);
			const existing = redlineState.races[id];
			const racer = data.racer as string;
			if (existing) {
				const racers = { ...existing.racers };
				delete racers[racer];
				redlineState.races = { ...redlineState.races, [id]: { ...existing, racers } };
			}
			break;
		}
		case 'FINISH_RACE': {
			const id = String(data.id);
			redlineState.races = { ...redlineState.races, [id]: data.race as RedlineRace };
			break;
		}
		case 'I_RACE':
			redlineState.inRace = Boolean(data.state);
			break;
		case 'RACE_STATE_CHANGE':
			redlineState.creatorActive = data.state != null;
			break;
		case 'NEW_INVITE': {
			const invite = data.invite as RedlineInvite;
			if (!redlineState.invites.some((i) => i.id === invite.id)) redlineState.invites = [...redlineState.invites, invite];
			break;
		}
	}
}

// local-only mutations after a successful Nui call, server is the source of truth on the next push
export function addLocalRedlineRace(race: RedlineRace) {
	redlineState.races = { ...redlineState.races, [String(race.id)]: race };
}

export function setRedlineCreatorActive(active: boolean) {
	redlineState.creatorActive = active;
}

export function removeRedlineInvite(id: string | number) {
	redlineState.invites = redlineState.invites.filter((i) => String(i.id) !== String(id));
}
