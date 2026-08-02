import type { PhoneApp } from '../../config';
import type { CallRecord, Contact, EmailMessage, PhoneAppsData, PhoneCharacterData } from '../types';

export const dataState = $state({
	player: null as PhoneCharacterData | null,
	contacts: [] as Contact[],
	calls: [] as CallRecord[],
	emails: [] as EmailMessage[],
	myDocuments: [] as Record<string, unknown>[],
	onDuty: false as string | false,
	permissions: {} as Record<string, unknown>,
	pendingShares: [] as unknown[],
	unread: {} as Record<string, number>,
	appRegistry: {} as Record<string, PhoneApp>,
	extra: {} as Record<string, unknown>,
});

type ListKey = 'contacts' | 'calls' | 'emails' | 'myDocuments';
const LIST_KEYS: ListKey[] = ['contacts', 'calls', 'emails', 'myDocuments'];

function isListKey(type: string): type is ListKey {
	return (LIST_KEYS as string[]).includes(type);
}

// dict-shaped extra data keyed by an id (e.g. adverts, keyed by player source) rather than array-shaped -
// server/apps/adverts.lua pushes SET_DATA (full dict), ADD_DATA (one entry keyed by source),
// UPDATE_DATA (id + patch), REMOVE_DATA (id) for this exact shape, so extra needs the same four ops the
// list keys get, just merging into a dict instead of splicing an array
const DICT_KEYS = ['adverts'];

function isDictKey(type: string): boolean {
	return DICT_KEYS.includes(type);
}

function addToDict(key: string, id: unknown, item: Record<string, unknown>) {
	const dict = (dataState.extra[key] as Record<string, unknown>) ?? {};
	dataState.extra = { ...dataState.extra, [key]: { ...dict, [String(id)]: item } };
}

function updateInDict(key: string, id: unknown, patch: Record<string, unknown>) {
	const dict = (dataState.extra[key] as Record<string, unknown>) ?? {};
	const existing = (dict[String(id)] as Record<string, unknown>) ?? {};
	dataState.extra = { ...dataState.extra, [key]: { ...dict, [String(id)]: { ...existing, ...patch } } };
}

function removeFromDict(key: string, id: unknown) {
	const dict = { ...((dataState.extra[key] as Record<string, unknown>) ?? {}) };
	delete dict[String(id)];
	dataState.extra = { ...dataState.extra, [key]: dict };
}

function setList(key: ListKey, items: unknown[]) {
	dataState[key] = items as never;
}

function addToList(key: ListKey, item: Record<string, unknown>) {
	dataState[key] = [...(dataState[key] as Record<string, unknown>[]), item] as never;
}

function updateInList(key: ListKey, id: unknown, patch: Record<string, unknown>) {
	dataState[key] = (dataState[key] as Record<string, unknown>[]).map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)) as never;
}

function removeFromList(key: ListKey, id: unknown) {
	dataState[key] = (dataState[key] as Record<string, unknown>[]).filter((entry) => entry.id !== id) as never;
}

// ADD_UNREAD only ever grows the badge count (Lua has no corresponding "clear" message) - opening the
// app is the acknowledgment moment, so nav.svelte.ts's navigateToApp calls this to zero it back out
export function clearUnread(name: string) {
	if (!dataState.unread[name]) return;
	dataState.unread = { ...dataState.unread, [name]: 0 };
}

// optimistic local update after a fire-and-forget Home/Dock/Reorder Nui call, server is the source of truth
// on next full data refresh but there's no response to await here
export function updatePlayerApps(patch: Partial<PhoneAppsData>) {
	if (!dataState.player) return;
	dataState.player = { ...dataState.player, Apps: { ...dataState.player.Apps, ...patch } };
}

// same idea for PhoneSettings after Nui.updateSetting - matches main.lua's own manual UPDATE_DATA for volume
export function updatePlayerSetting<K extends keyof PhoneCharacterData['PhoneSettings']>(key: K, value: PhoneCharacterData['PhoneSettings'][K]) {
	if (!dataState.player) return;
	dataState.player = { ...dataState.player, PhoneSettings: { ...dataState.player.PhoneSettings, [key]: value } };
}

// optimistic local update after Buy/Sell/Transfer Crypto, same reasoning as updatePlayerApps
export function updatePlayerCrypto(short: string, quantity: number) {
	if (!dataState.player) return;
	dataState.player = { ...dataState.player, Crypto: { ...dataState.player.Crypto, [short]: quantity } };
}

export function handleDataMessage(type: string, data: Record<string, unknown>) {
	switch (type) {
		case 'SET_APPS': {
			const registry: Record<string, PhoneApp> = {};
			for (const app of Object.values(data ?? {}) as PhoneApp[]) {
				if (app?.name) registry[app.name] = app;
			}
			dataState.appRegistry = registry;
			break;
		}
		case 'SET_DATA': {
			const key = data.type as string;
			const payload = data.data;
			if (key === 'player') dataState.player = payload as PhoneCharacterData;
			else if (key === 'onDuty') dataState.onDuty = (payload as string | false) || false;
			else if (isListKey(key)) setList(key, (payload as unknown[]) ?? []);
			else dataState.extra = { ...dataState.extra, [key]: payload };
			break;
		}
		case 'ADD_DATA': {
			const key = data.type as string;
			const payload = data.data as Record<string, unknown>;
			if (isListKey(key)) addToList(key, payload);
			else if (isDictKey(key)) addToDict(key, data.key, payload);
			else dataState.extra = { ...dataState.extra, [key]: payload };
			break;
		}
		case 'UPDATE_DATA': {
			const key = data.type as string;
			if (isListKey(key)) updateInList(key, data.id, data.data as Record<string, unknown>);
			else if (isDictKey(key)) updateInDict(key, data.id, data.data as Record<string, unknown>);
			break;
		}
		case 'REMOVE_DATA': {
			const key = data.type as string;
			if (isListKey(key)) removeFromList(key, data.id);
			else if (isDictKey(key)) removeFromDict(key, data.id);
			break;
		}
		case 'RESET_DATA':
			dataState.player = null;
			dataState.contacts = [];
			dataState.calls = [];
			dataState.emails = [];
			dataState.myDocuments = [];
			dataState.onDuty = false;
			dataState.extra = {};
			break;
		case 'ADD_UNREAD': {
			const name = data.name as string;
			const count = (data.count as number) ?? 1;
			dataState.unread = { ...dataState.unread, [name]: (dataState.unread[name] ?? 0) + count };
			break;
		}
		case 'LOAD_PERMS':
			dataState.permissions = data as Record<string, unknown>;
			break;
		case 'RECEIVE_SHARE':
			dataState.pendingShares = [...dataState.pendingShares, data];
			break;
	}
}
