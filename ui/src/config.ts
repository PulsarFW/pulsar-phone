/*
	Pulsar Phone content config.
	Server owners: for colors/fonts, edit theme.css instead you have been warned
*/

// icon: a plain name is a fas (free solid) icon, a [style, name] pair picks a different FA style
// mirrors server/data.lua's _appData shape exactly - keep both in sync when adding/editing apps
export interface AppInternalRoute {
	app: string;
	params?: string;
}

export interface PhoneAppRestriction {
	state?: string;
	job?: Record<string, number>;
	workplace?: string;
	grade?: string;
	jobPermission?: string;
	phonePermission?: { app: string; permission: string };
	repuation?: string;
	repuationAmount?: number;
}

export interface PhoneApp {
	name: string;
	storeLabel: string;
	label: string;
	icon: string | [string, string];
	color: string;
	params: string;
	internal?: AppInternalRoute[];
	canUninstall: boolean;
	store: boolean;
	unread: number;
	hidden?: boolean;
	requirements?: Record<string, unknown>;
	restricted?: PhoneAppRestriction;
}

// core apps, always installed, can't be removed from the home screen
export const CORE_APPS: PhoneApp[] = [
	{ name: 'phone', storeLabel: 'Phone', label: 'Phone', icon: 'phone', color: '#21a500', params: '', canUninstall: false, store: true, unread: 0 },
	{ name: 'messages', storeLabel: 'Messages', label: 'Messages', icon: 'comment', color: '#ff0000', params: '', canUninstall: false, store: true, unread: 0 },
	{
		name: 'contacts',
		storeLabel: 'Contacts',
		label: 'Contacts',
		icon: 'address-book',
		color: '#ff6a00',
		params: '',
		canUninstall: false,
		store: true,
		unread: 0,
	},
	{ name: 'store', storeLabel: 'App Store', label: 'App Store', icon: 'hippo', color: '#ad8d1a', params: '', canUninstall: false, store: true, unread: 0 },
	{ name: 'settings', storeLabel: 'Settings', label: 'Settings', icon: 'gear', color: '#18191e', params: '', canUninstall: false, store: true, unread: 0 },
	{ name: 'email', storeLabel: 'Email', label: 'Email', icon: 'envelope', color: '#10909c', params: '', canUninstall: false, store: true, unread: 0 },
	{ name: 'bank', storeLabel: 'Fleeca', label: 'Fleeca', icon: 'building-columns', color: '#268f3a', params: '', canUninstall: false, store: true, unread: 0 },
];

// phone case frame images, files live at ui/images/frames/*.png (sibling to ui/dist/, kept as runtime strings, not bundled imports)
export const PHONE_CASES = ['default', 'blue', 'gold', 'pink', 'white'] as const;
export type PhoneCaseId = (typeof PHONE_CASES)[number];

export function getPhoneCaseImage(caseId: string | undefined | null): string {
	const id = (PHONE_CASES as readonly string[]).includes(caseId ?? '') ? (caseId as string) : 'default';
	return `../images/frames/${id}.png`;
}

// each frame PNG is 500x1000, matching the phone's base canvas. Bezel thickness and corner radius vary
// per case (measured from each frame's alpha channel, not eyeballed) so every case needs its own insets.
export interface PhoneCaseCutout {
	left: number;
	top: number;
	right: number;
	bottom: number;
	radius: number;
}

// insets are shaded ~0.4pt smaller than the raw measured cutout on every edge - a deliberate safety
// margin so the content fully covers the frame PNG's antialiased edge instead of sitting exactly on it
const PHONE_CASE_CUTOUTS: Record<PhoneCaseId, PhoneCaseCutout> = {
	default: { left: 8.4, top: 3.8, right: 6.0, bottom: 4.9, radius: 49 },
	blue: { left: 1.2, top: 3.2, right: 2.2, bottom: 2.7, radius: 31 },
	gold: { left: 3.0, top: 3.9, right: 2.2, bottom: 2.6, radius: 33 },
	pink: { left: 1.8, top: 3.9, right: 2.4, bottom: 2.7, radius: 33 },
	white: { left: 2.8, top: 3.8, right: 2.2, bottom: 2.9, radius: 33 },
};

export function getPhoneCaseCutout(caseId: string | undefined | null): PhoneCaseCutout {
	const id = (PHONE_CASES as readonly string[]).includes(caseId ?? '') ? (caseId as PhoneCaseId) : 'default';
	return PHONE_CASE_CUTOUTS[id];
}

// wallpapers live at ui/images/wallpapers/1.webp..24.webp, id is "wallpaper" for #1 and "wallpaperN" for the rest
export interface WallpaperInfo {
	id: string;
	label: string;
	file: string;
}

export const DEFAULT_WALLPAPER = 'wallpaper';

export const WALLPAPERS: WallpaperInfo[] = Array.from({ length: 24 }, (_, i) => {
	const n = i + 1;
	const id = n === 1 ? 'wallpaper' : `wallpaper${n}`;
	return { id, label: `Wallpaper ${n}`, file: `../images/wallpapers/${n}.webp` };
});

export function getWallpaperImage(wallpaper: string | undefined | null): string {
	return WALLPAPERS.find((w) => w.id === wallpaper)?.file ?? WALLPAPERS[0].file;
}

const DEFAULT_ACCENT = '#7c1ac1';

export function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	const full = h.length === 3
		? h
				.split('')
				.map((c) => c + c)
				.join('')
		: h;
	const n = parseInt(full, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
	const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
	return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, '0')).join('')}`;
}

// crude linear shade toward white/black, not a real chroma-js port, close enough for a light/dark accent pair
function shade(hex: string, percent: number): string {
	const [r, g, b] = hexToRgb(hex);
	const target = percent < 0 ? 0 : 255;
	const p = Math.abs(percent);
	return rgbToHex(r + (target - r) * p, g + (target - g) * p, b + (target - b) * p);
}

// additive per-channel RGB shift, clamped 0-255, used for the gradient/shadow/border on each app icon badge
export function adjustColor(hex: string, amount: number): string {
	const [r, g, b] = hexToRgb(hex);
	return rgbToHex(r + amount, g + amount, b + amount);
}

// PhoneSettings.colors.accent is per-player, pushed from the server - call once on load and whenever it changes
export function applyAccentColor(hex: string | undefined | null): void {
	const accent = hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : DEFAULT_ACCENT;
	const root = document.documentElement.style;
	root.setProperty('--color-primary', accent);
	root.setProperty('--color-primary-light', shade(accent, 0.25));
	root.setProperty('--color-primary-dark', shade(accent, -0.3));
}

export const CURRENCY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
