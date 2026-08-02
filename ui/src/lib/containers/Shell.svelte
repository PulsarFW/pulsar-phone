<!-- root: full phone when open, shrunk outside-phone notification banner when closed -->
<script lang="ts">
	import PhoneCase from './PhoneCase.svelte';
	import OutsidePhoneBanner from './OutsidePhoneBanner.svelte';
	import Home from '../components/Home.svelte';
	import AppList from '../components/AppList.svelte';
	import NotificationsList from '../components/NotificationsList.svelte';
	import PhoneApp from '../apps/phone/PhoneApp.svelte';
	import MessagesApp from '../apps/messages/MessagesApp.svelte';
	import ContactsApp from '../apps/contacts/ContactsApp.svelte';
	import StoreApp from '../apps/store/StoreApp.svelte';
	import SettingsApp from '../apps/settings/SettingsApp.svelte';
	import EmailApp from '../apps/email/EmailApp.svelte';
	import BankApp from '../apps/bank/BankApp.svelte';
	import LoansApp from '../apps/loans/LoansApp.svelte';
	import TwitterApp from '../apps/twitter/TwitterApp.svelte';
	import ChatterApp from '../apps/chatter/ChatterApp.svelte';
	import AdvertsApp from '../apps/adverts/AdvertsApp.svelte';
	import RedlineApp from '../apps/redline/RedlineApp.svelte';
	import BluelineApp from '../apps/blueline/BluelineApp.svelte';
	import ComanagerApp from '../apps/comanager/ComanagerApp.svelte';
	import LaborApp from '../apps/labor/LaborApp.svelte';
	import CryptoApp from '../apps/crypto/CryptoApp.svelte';
	import Dyn8App from '../apps/dyn8/Dyn8App.svelte';
	import HomemanageApp from '../apps/homemanage/HomemanageApp.svelte';
	import GarageApp from '../apps/garage/GarageApp.svelte';
	import PingemApp from '../apps/pingem/PingemApp.svelte';
	import CalculatorApp from '../apps/calculator/CalculatorApp.svelte';
	import DocumentsApp from '../apps/documents/DocumentsApp.svelte';
	import ServicesApp from '../apps/services/ServicesApp.svelte';
	import ChopperApp from '../apps/chopper/ChopperApp.svelte';
	import MediaApp from '../apps/media/MediaApp.svelte';
	import MusicApp from '../apps/music/MusicApp.svelte';
	import PlaceholderApp from '../components/PlaceholderApp.svelte';
	import { shellState } from '../store/shell.svelte';
	import { navState, navigateHome } from '../store/nav.svelte';
	import { dataState } from '../store/data.svelte';
	import { Nui } from '../nui';

	const NOTIFICATIONS_SCREEN = '__notifications__';
	const ALL_APPS_SCREEN = '__all_apps__';
	const SYSTEM_SCREENS = [NOTIFICATIONS_SCREEN, ALL_APPS_SCREEN];

	let lastResetToken = shellState.navResetToken;
	$effect(() => {
		if (shellState.navResetToken !== lastResetToken) {
			lastResetToken = shellState.navResetToken;
			navigateHome();
		}
	});

	// last line of defense: if the current app got uninstalled or isn't in the registry, bounce home
	$effect(() => {
		if (navState.app && !SYSTEM_SCREENS.includes(navState.app) && dataState.player && !dataState.player.Apps.installed.includes(navState.app)) {
			navigateHome();
		}
	});

	// the phone is authored at a fixed 500x1000 canvas and uniformly rescaled by PhoneSettings.zoom via a
	// single CSS transform - a true rescale (fonts/icons/paddings/radii all shrink together), not just a
	// resized container with fixed-size content inside it (zoom is a scale slider, not a scroll-area
	// slider). Not full-screen - positioned at PhonePosition within a full-viewport drag-bounds layer.
	const BASE_WIDTH = 500;
	const BASE_HEIGHT = 1000;
	const zoom = $derived(dataState.player?.PhoneSettings.zoom ?? 75);
	const scale = $derived(zoom / 100);
	// floor, not the raw product - prevents the box from ever rounding larger than the transformed content and exposing the scene behind it
	const boxWidth = $derived(Math.floor(BASE_WIDTH * scale));
	const boxHeight = $derived(Math.floor(BASE_HEIGHT * scale));

	// whole phone body is the drag handle when unlocked - a small movement threshold keeps normal button/link clicks working
	let dragOrigin: { pointerX: number; pointerY: number; boxX: number; boxY: number } | null = null;
	let isDragging = false;

	function clamp(value: number, max: number): number {
		return Math.max(0, Math.min(max, value));
	}

	function onPointerDown(e: PointerEvent) {
		if (shellState.locked || e.button !== 0) return;
		dragOrigin = { pointerX: e.clientX, pointerY: e.clientY, boxX: shellState.position.x, boxY: shellState.position.y };
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragOrigin) return;
		const dx = e.clientX - dragOrigin.pointerX;
		const dy = e.clientY - dragOrigin.pointerY;
		if (!isDragging && Math.hypot(dx, dy) > 4) isDragging = true;
		if (isDragging) {
			shellState.position = {
				x: clamp(dragOrigin.boxX + dx, window.innerWidth - boxWidth),
				y: clamp(dragOrigin.boxY + dy, window.innerHeight - boxHeight),
			};
		}
	}

	function onPointerUp() {
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerUp);
		if (isDragging) Nui.savePosition(shellState.position.x, shellState.position.y);
		dragOrigin = null;
		isDragging = false;
	}
</script>

{#if shellState.visible}
	<div class="outer">
		<div
			class="phone-box"
			class:unlocked={!shellState.locked}
			style:left={`${shellState.position.x}px`}
			style:top={`${shellState.position.y}px`}
			style:width={`${boxWidth}px`}
			style:height={`${boxHeight}px`}
			onpointerdown={onPointerDown}
			role="group"
			aria-label="Phone"
		>
			<div class="phone-scale" style:transform={`scale(${scale})`}>
				<PhoneCase>
					{#if navState.app === null}
						<Home />
					{:else if navState.app === NOTIFICATIONS_SCREEN}
						<NotificationsList />
					{:else if navState.app === ALL_APPS_SCREEN}
						<AppList />
					{:else if navState.app === 'phone'}
						<PhoneApp />
					{:else if navState.app === 'messages'}
						<MessagesApp />
					{:else if navState.app === 'contacts'}
						<ContactsApp />
					{:else if navState.app === 'store'}
						<StoreApp />
					{:else if navState.app === 'settings'}
						<SettingsApp />
					{:else if navState.app === 'email'}
						<EmailApp />
					{:else if navState.app === 'bank'}
						<BankApp />
					{:else if navState.app === 'loans'}
						<LoansApp />
					{:else if navState.app === 'twitter'}
						<TwitterApp />
					{:else if navState.app === 'chatter'}
						<ChatterApp />
					{:else if navState.app === 'adverts'}
						<AdvertsApp />
					{:else if navState.app === 'redline'}
						<RedlineApp />
					{:else if navState.app === 'blueline'}
						<BluelineApp />
					{:else if navState.app === 'comanager'}
						<ComanagerApp />
					{:else if navState.app === 'labor'}
						<LaborApp />
					{:else if navState.app === 'crypto'}
						<CryptoApp />
					{:else if navState.app === 'dyn8'}
						<Dyn8App />
					{:else if navState.app === 'homemanage'}
						<HomemanageApp />
					{:else if navState.app === 'garage'}
						<GarageApp />
					{:else if navState.app === 'pingem'}
						<PingemApp />
					{:else if navState.app === 'calculator'}
						<CalculatorApp />
					{:else if navState.app === 'documents'}
						<DocumentsApp />
					{:else if navState.app === 'services'}
						<ServicesApp />
					{:else if navState.app === 'chopper'}
						<ChopperApp />
					{:else if navState.app === 'media'}
						<MediaApp />
					{:else if navState.app === 'music'}
						<MusicApp />
					{:else if navState.app}
						<PlaceholderApp appId={navState.app} />
					{:else}
						<Home />
					{/if}
				</PhoneCase>
			</div>
		</div>
	</div>
{:else}
	<OutsidePhoneBanner />
{/if}

<style>
	.outer {
		height: 100vh;
		width: 100vw;
		position: absolute;
		inset: 0;
		margin: auto;
		overflow: hidden;
		pointer-events: none;
	}

	.phone-box {
		position: absolute;
		overflow: hidden;
		pointer-events: auto;
	}

	.phone-box.unlocked {
		cursor: move;
	}

	.phone-scale {
		width: 500px;
		height: 1000px;
		transform-origin: top left;
	}
</style>
