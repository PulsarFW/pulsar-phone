import type { ChatterGroup, ChatterInvite, ChatterMessage } from '../types';

export const chatterState = $state({
	groups: [] as ChatterGroup[],
	invites: [] as ChatterInvite[],
	// flat append-only log of live-pushed messages, ChatterApp filters by group and merges into its
	// own loaded list - kept here (not written from inside an effect) so it can't cause the same
	// effect/async re-entry loop the bank transactions loader hit
	incoming: [] as ChatterMessage[],
});

export function handleChatterMessage(type: string, data: Record<string, unknown>) {
	switch (type) {
		case 'CHATTER_SET_GROUPS':
			chatterState.groups = (data.groups as ChatterGroup[] | null) ?? [];
			break;
		case 'CHATTER_SET_INVITES': {
			const dict = (data.invites as Record<string, ChatterInvite> | null) ?? {};
			chatterState.invites = Object.values(dict);
			break;
		}
		case 'CHATTER_RECEIVE_INVITE': {
			const invite = data.invite as ChatterInvite;
			if (!chatterState.invites.some((i) => i.group === invite.group)) chatterState.invites = [...chatterState.invites, invite];
			break;
		}
		case 'CHATTER_UPDATE_GROUP': {
			const patch = data.group as Partial<ChatterGroup> & { id: number };
			if (chatterState.groups.some((g) => g.id === patch.id)) {
				chatterState.groups = chatterState.groups.map((g) => (g.id === patch.id ? { ...g, ...patch } : g));
			}
			break;
		}
		case 'CHATTER_CHANNEL_DELETED': {
			const id = data.group as number;
			chatterState.groups = chatterState.groups.filter((g) => g.id !== id);
			break;
		}
		case 'CHATTER_RECEIVED_MESSAGE':
			chatterState.incoming = [...chatterState.incoming, data as unknown as ChatterMessage];
			break;
	}
}

// local-only mutations after a successful Nui call, server is the source of truth on next full refresh
export function addLocalGroup(group: ChatterGroup) {
	chatterState.groups = [...chatterState.groups, group];
}

export function removeLocalGroup(id: number) {
	chatterState.groups = chatterState.groups.filter((g) => g.id !== id);
}

export function removeLocalInvite(group: number) {
	chatterState.invites = chatterState.invites.filter((i) => i.group !== group);
}
