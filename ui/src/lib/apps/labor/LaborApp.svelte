<!-- Jobs (gig labor): Jobs, Groups, Reputation tabs -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Loader from '../../primitives/Loader.svelte';
	import Confirm from '../../primitives/Confirm.svelte';
	import Tabs from '../../primitives/Tabs.svelte';
	import { dataState } from '../../store/data.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { LaborDetails, LaborJob, Workgroup } from '../../types';

	const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
	const appColor = $derived(dataState.appRegistry['labor']?.color ?? '#05737d');

	let tab = $state('jobs');
	let details = $state<LaborDetails | null>(null);
	let loading = $state(false);
	let loaded = $state(false);

	async function load() {
		loading = true;
		const res = await Nui.laborGetDetails();
		if (res) details = res;
		loading = false;
		loaded = true;
	}

	$effect(() => {
		if (!loaded) load();
	});

	function hasState(state: string | undefined): boolean {
		if (!state) return true;
		return Boolean(dataState.player?.States?.includes(state));
	}

	const jobs = $derived.by(() => {
		if (!details) return [];
		return Object.values(details.jobs)
			.filter((j) => !j.Restricted || hasState(j.Restricted.state))
			.sort((a, b) => Number(Boolean(b.Restricted)) - Number(Boolean(a.Restricted)));
	});

	const mySid = $derived(dataState.player?.SID);
	const myGroup = $derived(
		details?.groups.find((g) => g.Creator.SID === mySid || g.Members.some((m) => m.SID === mySid)),
	);
	const otherGroups = $derived((details?.groups ?? []).filter((g) => g !== myGroup));

	async function quitTempJob() {
		if (!dataState.player?.TempJob || !details) return;
		const job = details.jobs[dataState.player.TempJob];
		const ok = await Nui.laborQuitJob(dataState.player.TempJob);
		pushAlert(ok ? `Quit ${job?.Name ?? 'Job'}` : 'Unable to Quit Job', ok ? undefined : 'error');
		if (ok) load();
	}

	async function startJob(job: LaborJob) {
		const ok = await Nui.laborStartJob(job.Id, Boolean(myGroup));
		pushAlert(ok ? `Started ${job.Name}` : 'Unable to Start Job', ok ? undefined : 'error');
		if (ok) load();
	}

	function jobDisabled(): boolean {
		return (Boolean(myGroup) && myGroup!.Creator.SID !== mySid) || Boolean(dataState.player?.TempJob) || loading;
	}

	// workgroups
	let creatingGroup = $state(false);
	let leavingGroup = $state(false);
	let disbandingGroup = $state(false);

	async function confirmCreateGroup() {
		creatingGroup = false;
		const ok = await Nui.laborCreateWorkgroup();
		pushAlert(ok ? 'Workgroup Created' : 'Unable to Create Workgroup', ok ? undefined : 'error');
		load();
	}

	async function joinGroup(group: Workgroup) {
		if (group.Working) return;
		const ok = await Nui.laborJoinWorkgroup(group);
		pushAlert(ok ? 'Sent Request To Join' : 'Unable to Join Workgroup', ok ? undefined : 'error');
		load();
	}

	async function confirmDisbandGroup() {
		disbandingGroup = false;
		const ok = await Nui.laborDisbandWorkgroup();
		pushAlert(ok ? 'Workgroup Disbanded' : 'Unable to Disband Workgroup', ok ? undefined : 'error');
		load();
	}

	async function confirmLeaveGroup() {
		if (!myGroup) return;
		leavingGroup = false;
		const ok = await Nui.laborLeaveWorkgroup(myGroup);
		pushAlert(ok ? 'Left Workgroup' : 'Unable to Leave Workgroup', ok ? undefined : 'error');
		load();
	}

	function groupJoinDisabled(group: Workgroup): boolean {
		return Boolean(myGroup) || group.Members.length >= 4 || loading || group.Working || Boolean(dataState.player?.TempJob);
	}

	function normalise(rep: { value: number; current?: { value: number }; next?: { value: number } }): number {
		const min = rep.current?.value ?? 0;
		const max = rep.next?.value ?? 1000;
		if (max === min) return 100;
		return Math.max(0, Math.min(100, ((rep.value - min) * 100) / (max - min)));
	}
</script>

<AppContainer appId="labor" useAppColor={true}>
	{#snippet actions()}
		{#if tab === 'jobs' && dataState.player?.TempJob}
			<button class="header-action" onclick={quitTempJob} aria-label="Quit Job"><Icon name="right-from-bracket" size="20px" /></button>
		{/if}
		{#if tab === 'groups'}
			{#if myGroup}
				{#if myGroup.Creator.SID === mySid}
					<button class="header-action" onclick={() => (disbandingGroup = true)} disabled={loading} aria-label="Disband Workgroup">
						<Icon name="trash" size="20px" />
					</button>
				{:else}
					<button class="header-action" onclick={() => (leavingGroup = true)} disabled={loading || myGroup.Working} aria-label="Leave Workgroup">
						<Icon name="right-from-bracket" size="20px" />
					</button>
				{/if}
			{:else}
				<button class="header-action" onclick={() => (creatingGroup = true)} disabled={loading || Boolean(dataState.player?.TempJob)} aria-label="Create Workgroup">
					<Icon name="plus" size="20px" />
				</button>
			{/if}
		{/if}
		<button class="header-action" onclick={load} disabled={loading} aria-label="Refresh"><Icon name="arrows-rotate" size="20px" /></button>
	{/snippet}
	<div class="labor">
		<div class="content">
			{#if loading && !loaded}
				<Loader static text="Loading" />
			{:else if tab === 'jobs'}
				{#if jobs.length === 0}
					<div class="empty">No Jobs Available</div>
				{:else}
					<div class="list">
						{#each jobs as job (job.Id)}
							<div class="job-card" style:border-left-color={appColor}>
								{#if job.Restricted}
									<span class="job-restricted"><Icon name="shield-halved" size="60px" /></span>
								{/if}
								<div class="job-top">
									<div>
										<div class="job-name">{job.Name}</div>
										{#if job.Salary > 0}<div class="job-pay">{usd.format(job.Salary)}</div>{/if}
									</div>
									<div class="job-count">{job.Limit === false ? `${job.OnDuty.length} / ∞` : `${job.OnDuty.length} / ${job.Limit}`}</div>
								</div>
								<button class="job-start" style:background={appColor} disabled={jobDisabled()} onclick={() => startJob(job)}>Start</button>
							</div>
						{/each}
					</div>
				{/if}
			{:else if tab === 'groups'}
				{#if (details?.groups.length ?? 0) === 0}
					<div class="empty">No Workgroups</div>
				{:else}
					<div class="list">
						{#if myGroup}
							<div class="job-card mine" style:border-left-color={appColor}>
								{#if myGroup.Creator.SID === mySid}<span class="job-crown"><Icon name="crown" size="60px" /></span>{/if}
								<div class="job-top">
									<div class="job-name">
										{#if myGroup.Creator.SID === mySid}<Icon name="crown" size="11px" />{/if}
										{myGroup.Creator.First} {myGroup.Creator.Last}
									</div>
									<div class="job-count">{myGroup.Members.length + 1} / 5</div>
								</div>
								<div class="group-members">
									{#each myGroup.Members as m (m.SID)}
										<span class="member">{m.First} {m.Last}</span>
									{/each}
								</div>
							</div>
						{/if}
						{#each otherGroups as group, i (i)}
							<div class="job-card" style:border-left-color={appColor}>
								<div class="job-top">
									<div class="job-name">
										{#if group.Creator.SID === mySid}<Icon name="crown" size="11px" />{/if}
										{group.Creator.First} {group.Creator.Last}
									</div>
									<div class="job-count">{group.Members.length + 1} / 5</div>
								</div>
								<button class="job-start" style:background={appColor} disabled={groupJoinDisabled(group)} onclick={() => joinGroup(group)}>Join</button>
							</div>
						{/each}
					</div>
				{/if}
			{:else if (details?.reputations.length ?? 0) === 0}
				<div class="empty">No Reputation Built</div>
			{:else}
				<div class="list">
					{#each details?.reputations ?? [] as rep (rep.id)}
						<div class="rep-card">
							<div class="rep-title">{rep.label}</div>
							<div class="rep-row">
								<span class="rep-rank">{rep.current?.label ?? 'No Rank'}</span>
								<div class="rep-bar"><div class="rep-fill" style:background={appColor} style:width={`${normalise(rep)}%`}></div></div>
								<span class="rep-rank">{rep.next?.label ?? 'Unknown'}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
		<Tabs tabs={[{ id: 'jobs', label: 'Jobs' }, { id: 'groups', label: 'Groups' }, { id: 'rep', label: 'Reputation' }]} bind:active={tab} accent={appColor} />
	</div>
</AppContainer>

<Confirm showing={creatingGroup} title="Create Workgroup?" acceptLabel="Create" denyLabel="Cancel" onAccept={confirmCreateGroup} onDeny={() => (creatingGroup = false)} />
<Confirm showing={disbandingGroup} title="Disband Workgroup?" acceptLabel="Disband" denyLabel="Cancel" onAccept={confirmDisbandGroup} onDeny={() => (disbandingGroup = false)} />
<Confirm showing={leavingGroup} title="Leave Workgroup?" acceptLabel="Leave" denyLabel="Cancel" onAccept={confirmLeaveGroup} onDeny={() => (leavingGroup = false)} />

<style>
	.header-action {
		background: none;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		padding: 6px 9px;
	}

	.header-action:disabled {
		opacity: 0.4;
	}

	.labor {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.content {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.empty {
		text-align: center;
		margin-top: 25%;
		font-size: 16px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.list {
		padding: 10px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.job-card {
		position: relative;
		background: var(--color-bg-panel);
		border-left: 3px solid;
		border-radius: 10px;
		box-shadow: var(--shadow-card);
		padding: 12px 14px;
		overflow: hidden;
	}

	.job-restricted,
	.job-crown {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.08;
		pointer-events: none;
		color: var(--color-error-light);
	}

	.job-crown {
		color: gold;
	}

	.job-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.job-name {
		font-size: 16px;
		color: var(--color-text);
	}

	.job-pay {
		font-size: 13px;
		color: var(--color-success);
	}

	.job-count {
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.group-members {
		display: flex;
		flex-direction: column;
		margin-top: 6px;
		gap: 2px;
	}

	.member {
		font-size: 12px;
		color: var(--color-text-alt);
		padding-left: 12px;
	}

	.job-start {
		width: 100%;
		margin-top: 10px;
		border: none;
		border-radius: 8px;
		padding: 8px;
		color: #fff;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
	}

	.job-start:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.rep-card {
		background: var(--color-bg-panel);
		border-radius: 12px;
		padding: 12px 14px;
		box-shadow: var(--shadow-card);
	}

	.rep-title {
		text-align: center;
		font-size: 16px;
		font-weight: 700;
		color: var(--color-text);
		margin-bottom: 8px;
	}

	.rep-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.rep-rank {
		font-size: 12.5px;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.rep-bar {
		flex: 1;
		height: 6px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}

	.rep-fill {
		height: 100%;
	}
</style>
