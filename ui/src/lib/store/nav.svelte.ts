import { clearUnread } from './data.svelte';
import { shellState } from './shell.svelte';

interface NavEntry {
	app: string | null;
	route: string;
}

export const navState = $state({
	app: null as string | null,
	route: '',
});

let stack: NavEntry[] = [];

export function navigateToApp(app: string, route = '') {
	if (shellState.limited && app !== 'phone') return;
	stack.push({ app: navState.app, route: navState.route });
	navState.app = app;
	navState.route = route;
	clearUnread(app);
}

export function navigateHome() {
	if (shellState.limited) return;
	stack = [];
	navState.app = null;
	navState.route = '';
}

// payphone mode - drops any existing history and pins the phone app open
export function forceApp(app: string) {
	stack = [];
	navState.app = app;
	navState.route = '';
}

export function goBack() {
	const prev = stack.pop();
	if (!prev) {
		navigateHome();
		return;
	}
	navState.app = prev.app;
	navState.route = prev.route;
}
