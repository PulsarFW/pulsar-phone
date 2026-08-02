<!-- city services directory: job-branded rows, online count, GPS + call -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Loader from '../../primitives/Loader.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { navigateToApp } from '../../store/nav.svelte';
	import { Nui } from '../../nui';
	import type { ServiceEntry } from '../../types';

	let services = $state<ServiceEntry[]>([]);
	let loaded = $state(false);

	$effect(() => {
		if (!loaded) {
			loaded = true;
			Nui.servicesGetServices().then((res) => {
				if (res) services = res;
			});
		}
	});

	async function setGPS(entry: ServiceEntry) {
		if (!entry.jobLocation) return;
		const ok = await Nui.servicesSetGPS(entry.jobLocation, entry.jobName);
		pushAlert(ok ? 'GPS Route Set' : 'Unable To Set GPS', ok ? undefined : 'error');
	}

	async function call(entry: ServiceEntry) {
		if (!entry.phoneNumber) return;
		const ok = await Nui.createCall(entry.phoneNumber);
		if (ok) navigateToApp('phone', `call/${entry.phoneNumber}`);
		else pushAlert('Unable To Start Call', 'error');
	}
</script>

<AppContainer appId="services" useAppColor={true}>
	{#if !loaded}
		<Loader static text="Loading Services" />
	{:else if services.length === 0}
		<div class="empty">No Services Available At This Time</div>
	{:else}
		<div class="list">
			{#each services as entry (entry.jobName)}
				<div class="row">
					<span class="job-badge" style:background={entry.jobColor} style:color={entry.jobTextColor}>
						<Icon name={entry.jobIcon ?? 'building'} size="17px" />
					</span>
					<div class="job-text">
						<span class="job-label">{entry.jobLabel}</span>
						<span class="job-status">
							<span class="online-dot" class:many={entry.players.length > 1}></span>
							{entry.players.length} Online
						</span>
					</div>
					<div class="row-actions">
						<button class="row-btn" onclick={() => setGPS(entry)} aria-label={`Route to ${entry.jobLabel}`} disabled={!entry.jobLocation}>
							<Icon name="location-crosshairs" size="14px" />
						</button>
						{#if entry.phoneNumber}
							<button class="row-btn" onclick={() => call(entry)} aria-label={`Call ${entry.jobLabel}`}>
								<Icon name="phone" size="14px" />
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</AppContainer>

<style>
	.empty {
		text-align: center;
		margin-top: 25%;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.list {
		padding: 10px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	/* dark card + circular job color badge */
	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border-radius: 14px;
		background: var(--color-bg-panel);
		box-shadow: var(--shadow-card);
	}

	.job-badge {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.job-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.job-label {
		font-size: 15px;
		font-weight: 700;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.job-status {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.online-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #e0a020;
		flex-shrink: 0;
	}

	.online-dot.many {
		background: #2fbf4f;
	}

	.row-actions {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
	}

	.row-btn {
		background: rgba(255, 255, 255, 0.08);
		border: none;
		border-radius: 50%;
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text);
		cursor: pointer;
		flex-shrink: 0;
	}

	.row-btn:hover {
		background: rgba(255, 255, 255, 0.14);
	}

	.row-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}
</style>
