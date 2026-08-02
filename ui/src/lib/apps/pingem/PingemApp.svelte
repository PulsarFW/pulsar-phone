<!-- FINDR (send a map ping to another player) - full-bleed map-background screen, no AppContainer/titlebar -->
<script lang="ts">
	import Icon from '../../components/Icon.svelte';
	import AppInput from '../../primitives/AppInput.svelte';
	import { dataState } from '../../store/data.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';

	const appColor = $derived(dataState.appRegistry['pingem']?.color ?? '#e3db02');
	const hasVpn = $derived(Boolean(dataState.player?.States?.includes('PHONE_VPN')));

	let target = $state('');

	async function send(anon: boolean) {
		const id = Number(target);
		if (!target || Number.isNaN(id)) {
			pushAlert('Enter A Target State ID', 'error');
			return;
		}
		const ok = await Nui.pingemSend(id, anon);
		pushAlert(ok ? 'Sent Ping' : 'Unable To Send Ping', ok ? undefined : 'error');
	}
</script>

<div class="pingem">
	<div class="branding">
		<div class="title"><Icon name="map-pin" size="32px" />FINDR</div>
		<div class="slogan">Helping Your Directionally Challenged Friends Since 1969</div>
	</div>
	<div class="content" style:border-top-color={appColor}>
		<AppInput label="Target State ID" type="tel" bind:value={target} accent={appColor} />
		<button class="send-btn" style:background={appColor} onclick={() => send(false)}>Send Ping</button>
		{#if hasVpn}
			<button class="anon-btn" onclick={() => send(true)}>
				<Icon name="user-secret" size="14px" />
				Send Anonymous Ping
			</button>
		{/if}
	</div>
</div>

<style>
	.pingem {
		height: 100%;
		position: relative;
		background:
			linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.65)), url('../../../../images/apps/pingem-map.webp');
		background-position: center;
		background-size: cover;
	}

	.branding {
		position: absolute;
		top: 90px;
		left: 0;
		right: 0;
		text-align: center;
		padding: 0 12px;
	}

	.title {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-size: 34px;
		font-style: italic;
		font-weight: 700;
		color: #fff;
	}

	.slogan {
		font-size: 13px;
		color: rgba(255, 255, 255, 0.8);
		max-width: 75%;
		margin: 6px auto 0;
	}

	.content {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 16px 14px;
		border-top: 1px solid;
		background: rgba(20, 21, 20, 0.94);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.send-btn {
		width: 100%;
		border: none;
		border-radius: var(--radius);
		padding: 10px;
		font-size: 14px;
		font-weight: 700;
		color: #14151480;
		cursor: pointer;
	}

	.anon-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		border: 1px solid var(--color-warning, #e0a020);
		border-radius: var(--radius);
		background: none;
		padding: 10px;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-warning, #e0a020);
		cursor: pointer;
	}
</style>
