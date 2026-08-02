import { applyMessage } from './messages';
import { CORE_APPS } from '../config';
import {
	MOCK_ADVERTS,
	MOCK_CHATTER_GROUPS,
	MOCK_CHATTER_INVITES,
	MOCK_CONTACTS,
	MOCK_DOCUMENTS,
	MOCK_EMAILS,
	MOCK_EXTERNAL_JOBS,
	MOCK_GARAGES,
	MOCK_JOB_DATA,
	MOCK_JOB_PERMISSIONS,
	MOCK_NAMED_JOB_PERMISSIONS,
	MOCK_PD_RACES,
	MOCK_PD_TRACKS,
	MOCK_PLAYER,
	MOCK_STORE_APPS,
	MOCK_REDLINE_TRACKS,
	MOCK_REDLINE_RACES,
	MOCK_REDLINE_INVITES,
} from './mockData';

export function startMock(): void {
	setTimeout(() => {
		applyMessage('SET_APPS', [...CORE_APPS, ...MOCK_STORE_APPS]);
		applyMessage('SET_DATA', { type: 'player', data: MOCK_PLAYER });
		applyMessage('SET_DATA', { type: 'contacts', data: MOCK_CONTACTS });
		applyMessage('SET_DATA', { type: 'emails', data: MOCK_EMAILS });
		applyMessage('LOAD_PERMS', { JOB_SELL: true });
		applyMessage('SET_DATA', { type: 'garages', data: MOCK_GARAGES });
		applyMessage('SET_DATA', { type: 'myDocuments', data: MOCK_DOCUMENTS });
		applyMessage('SET_DATA', { type: 'adverts', data: MOCK_ADVERTS });
		applyMessage('CHATTER_SET_GROUPS', { groups: MOCK_CHATTER_GROUPS });
		applyMessage('CHATTER_SET_INVITES', { invites: MOCK_CHATTER_INVITES });
		applyMessage('SET_DATA', { type: 'onDuty', data: 'police' });
		applyMessage('SET_DATA', { type: 'JobPermissions', data: MOCK_JOB_PERMISSIONS });
		applyMessage('SET_DATA', { type: 'tracks_pd', data: MOCK_PD_TRACKS });
		applyMessage('PD_EVENT_SPAWN', { races: MOCK_PD_RACES });
		applyMessage('SET_DATA', { type: 'externalJobs', data: MOCK_EXTERNAL_JOBS });
		applyMessage('SET_DATA', { type: 'NamedJobPermissions', data: MOCK_NAMED_JOB_PERMISSIONS });
		applyMessage('SET_DATA', { type: 'JobData', data: MOCK_JOB_DATA });
		applyMessage('SET_DATA', { type: 'tracks', data: MOCK_REDLINE_TRACKS });
		applyMessage('EVENT_SPAWN', { races: MOCK_REDLINE_RACES });
		for (const invite of MOCK_REDLINE_INVITES) applyMessage('NEW_INVITE', { invite });
		applyMessage('PHONE_VISIBLE', {});
	}, 200);
}
