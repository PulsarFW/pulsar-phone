import type { MessageThread, NewMessagePush } from '../types';

export const messagesState = $state({
	threads: [] as MessageThread[],
	lastReceived: null as NewMessagePush | null,
});

export function setThreads(threads: MessageThread[]) {
	messagesState.threads = threads;
}

// must be called right after consuming lastReceived, or it stays truthy and re-fires forever
export function clearLastReceived() {
	messagesState.lastReceived = null;
}

export function handleMessagesMessage(type: string, data: Record<string, unknown>) {
	switch (type) {
		case 'SET_MESSAGE_THREADS':
			messagesState.threads = (data.threads as MessageThread[]) ?? [];
			break;
		case 'UPDATE_THREAD_IF_EXISTS': {
			const thread = data.thread as MessageThread;
			messagesState.threads = messagesState.threads.map((t) => (t.number === thread.number ? { ...t, ...thread } : t));
			break;
		}
		case 'RECEIVED_NEW_MESSAGE':
			messagesState.lastReceived = data as unknown as NewMessagePush;
			break;
	}
}
