import { mount } from 'svelte';
import App from './App.svelte';
import './theme.css';

const target = document.getElementById('app');
if (!target) {
	throw new Error('#app mount node not found');
}

const app = mount(App, { target });

if (import.meta.env.DEV) {
	// the phone case PNGs have a small transparent margin around the phone silhouette itself - in-game
	// that's invisible (the NUI page is transparent, the 3D world shows through), but bare white page
	// background stands out badly in a browser preview
	document.body.classList.add('dev-preview');
	import('./lib/mock').then(({ startMock }) => startMock());
}

export default app;
