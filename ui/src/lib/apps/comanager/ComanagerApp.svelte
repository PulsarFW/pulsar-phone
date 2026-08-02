<!-- BizWiz (business/job management): Roster/Manage/Time Worked tabs. Rename/Disband/Transfer company
	 aren't wired here - Disband's server callback always errors and Transfer has none. -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Loader from '../../primitives/Loader.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import Confirm from '../../primitives/Confirm.svelte';
	import Dropdown from '../../primitives/Dropdown.svelte';
	import { dataState } from '../../store/data.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { JobData, JobGrade, JobWorkplace, RosterEmployee, TimeWorkedEntry } from '../../types';

	const view = $derived(navState.route.startsWith('view/') ? 'view' : 'list');
	const jobId = $derived(view === 'view' ? navState.route.slice('view/'.length) : null);

	const player = $derived(dataState.player);
	const externalJobs = $derived((dataState.extra.externalJobs as string[] | undefined) ?? []);
	const allJobData = $derived((dataState.extra.JobData as JobData[] | undefined) ?? []);
	const namedJobPerms = $derived((dataState.extra.NamedJobPermissions as Record<string, { name: string; restricted?: string[] | false }> | undefined) ?? {});

	// Lua's json.encode can't tell an empty array from an empty object, so a jobless character's
	// Jobs can arrive as {} instead of [] - ?? [] doesn't catch that since {} isn't null/undefined
	const myJobs = $derived((Array.isArray(player?.Jobs) ? player.Jobs : []).filter((j) => !externalJobs.includes(j.Id)));
	const playerJobData = $derived(myJobs.find((j) => j.Id === jobId));
	const jobData = $derived(allJobData.find((j) => j.Id === playerJobData?.Id));

	// SID/Owner coerced to string - same class of type mismatch as bank account IDs
	const isOwner = $derived(Boolean(player && jobData && jobData.Owner !== undefined && String(player.SID) === String(jobData.Owner)));

	function hasJobPerm(key: string): boolean {
		if (!playerJobData) return false;
		return Boolean(playerJobData.Grade.Permissions?.[key]) || isOwner;
	}
	const canManage = $derived(hasJobPerm('JOB_MANAGEMENT'));
	const canHire = $derived(hasJobPerm('JOB_HIRE'));
	const canFire = $derived(hasJobPerm('JOB_FIRE'));
	const canManageEmployees = $derived(hasJobPerm('JOB_MANAGE_EMPLOYEES'));

	// local, only matters while this one view is mounted
	let activeTab = $state<0 | 1 | 2>(0);
	let loadedJobFor = $state<string | null>(null);
	let loading = $state(false);
	let roster = $state<Record<string, RosterEmployee[]> | false>(false);
	let timeWorked = $state<TimeWorkedEntry[] | false>(false);
	let timeWorkedJob = $state('');

	async function fetchRoster(reqUpdate = false) {
		loading = true;
		const res = await Nui.comanagerFetchRoster(reqUpdate);
		roster = res.rosterData;
		loading = false;
	}

	async function fetchTimeWorked(id: string) {
		loading = true;
		const res = await Nui.comanagerFetchTimeWorked(id);
		timeWorked = res;
		timeWorkedJob = id;
		loading = false;
	}

	$effect(() => {
		if (view === 'view' && jobId && loadedJobFor !== jobId) {
			loadedJobFor = jobId;
			activeTab = 0;
			roster = false;
			fetchRoster();
		}
	});

	function switchTab(tab: 0 | 1 | 2) {
		activeTab = tab;
		if (tab === 2 && (timeWorked === false || timeWorkedJob !== jobId) && jobId) fetchTimeWorked(jobId);
	}

	const rosterForJob = $derived(jobId && roster ? (roster[jobId] ?? []) : []);

	function initialFor(): { Id: string; Name?: string; Workplace: JobWorkplace | null; Grade: JobGrade } | null {
		if (!jobData) return null;
		if (jobData.Workplaces && jobData.Workplaces.length > 0) {
			return { Id: jobData.Id, Workplace: jobData.Workplaces[0], Grade: jobData.Workplaces[0].Grades[0] };
		}
		return { Id: jobData.Id, Workplace: null, Grade: jobData.Grades?.[0] ?? { Id: '', Name: '', Level: 1, Permissions: {} } };
	}

	function canEditEmployee(e: RosterEmployee): boolean {
		if (!jobData || !playerJobData) return false;
		return (String(jobData.Owner) !== String(e.SID) || isOwner) && (playerJobData.Grade.Level > e.JobData.Grade.Level || isOwner) && (canManage || canManageEmployees || canFire);
	}

	// hire / edit employee modal
	type HireState = { SID: string; edit: boolean; First?: string; Last?: string; Job: { Id: string; Workplace: JobWorkplace | null; Grade: JobGrade } };
	let hiring = $state<HireState | null>(null);
	let firing = $state(false);

	function openHire() {
		const init = initialFor();
		if (!init) return;
		hiring = { SID: '', edit: false, Job: { Id: init.Id, Workplace: init.Workplace, Grade: init.Grade } };
	}

	function openEditEmployee(e: RosterEmployee) {
		hiring = { SID: String(e.SID), edit: true, First: e.First, Last: e.Last, Job: { Id: e.JobData.Id, Workplace: e.JobData.Workplace ?? null, Grade: e.JobData.Grade } };
	}

	function setHireWorkplace(wpId: string) {
		if (!hiring || !jobData?.Workplaces) return;
		const wp = jobData.Workplaces.find((w) => w.Id === wpId);
		if (wp) hiring = { ...hiring, Job: { ...hiring.Job, Workplace: wp, Grade: wp.Grades[0] } };
	}

	function setHireGrade(gradeId: string) {
		if (!hiring) return;
		const grades = hiring.Job.Workplace ? hiring.Job.Workplace.Grades : (jobData?.Grades ?? []);
		const g = grades.find((gr) => gr.Id === gradeId);
		if (g) hiring = { ...hiring, Job: { ...hiring.Job, Grade: g } };
	}

	async function submitHire() {
		if (!hiring || !player) return;
		if (hiring.edit) {
			const res = await Nui.comanagerUpdateEmployee({ SID: Number(hiring.SID), Job: { Id: hiring.Job.Id, Workplace: hiring.Job.Workplace, Grade: { Id: hiring.Job.Grade.Id } } });
			pushAlert(res.success ? 'Employee Updated' : 'Unable To Update Employee', res.success ? 'info' : 'error');
			if (res.success) fetchRoster();
		} else if (String(hiring.SID) === String(player.SID)) {
			pushAlert('You Cannot Hire Yourself', 'error');
		} else {
			const res = await Nui.comanagerHireEmployee({ SID: hiring.SID, Job: { Id: hiring.Job.Id, Workplace: hiring.Job.Workplace, Grade: { Id: hiring.Job.Grade.Id } } });
			if (res.success) pushAlert('Employment Offer Sent');
			else {
				const messages: Record<string, string> = {
					INVALID_PERMISSIONS: 'Not Authorized',
					INVALID_TARGET: 'Invalid Or Offline State ID',
					OUTSTANDING_OFFER: 'Person Has An Outstanding Employment Offer',
				};
				pushAlert(messages[res.code ?? ''] ?? 'Unable To Hire Employee', 'error');
			}
		}
		hiring = null;
	}

	async function confirmFire() {
		if (!hiring) return;
		firing = false;
		const res = await Nui.comanagerFireEmployee({ SID: Number(hiring.SID), Job: { Id: hiring.Job.Id } });
		pushAlert(res.success ? `${hiring.First} ${hiring.Last} Has Been Fired` : 'Unable To Fire Employee', res.success ? 'info' : 'error');
		hiring = null;
		if (res.success) fetchRoster();
	}

	// my employment / quit
	let viewingMine = $state(false);
	let quitConfirm = $state(false);
	async function submitQuit() {
		quitConfirm = false;
		viewingMine = false;
		if (!jobData) return;
		const ok = await Nui.comanagerQuitJob(jobData.Id);
		pushAlert(ok ? "Congrats, You Quit" : 'Unable To Quit Job', ok ? 'info' : 'error');
		if (ok) navigateToApp('comanager');
	}

	// grade editor (Manage tab)
	type GradeState = { edit: boolean; JobId: string; WorkplaceId: string | null; Id?: string; Name: string; Level: number; Permissions: Record<string, boolean>; Owner?: boolean };
	let grade = $state<GradeState | null>(null);
	let deleteGradeConfirm = $state(false);
	let expandedWorkplace = $state<string | null>(null);

	function openCreateGrade(workplaceId: string | null) {
		grade = { edit: false, JobId: jobData?.Id ?? '', WorkplaceId: workplaceId, Name: '', Level: 1, Permissions: {} };
	}

	function openEditGrade(g: JobGrade, workplaceId: string | null) {
		grade = { edit: true, JobId: jobData?.Id ?? '', WorkplaceId: workplaceId, Id: g.Id, Name: g.Name, Level: g.Level, Permissions: { ...g.Permissions }, Owner: g.Owner };
	}

	function togglePermission(key: string) {
		if (!grade) return;
		const perms = { ...grade.Permissions };
		if (perms[key]) delete perms[key];
		else perms[key] = true;
		grade = { ...grade, Permissions: perms };
	}

	async function submitGrade() {
		if (!grade || !grade.Name.trim()) return;
		const payload = { JobId: grade.JobId, WorkplaceId: grade.WorkplaceId, Name: grade.Name.trim(), Level: grade.Level, Permissions: grade.Permissions };
		const res = grade.edit ? await Nui.comanagerEditGrade({ ...payload, Id: grade.Id ?? '' }) : await Nui.comanagerCreateGrade(payload);
		pushAlert(res.success ? `Grade ${grade.edit ? 'Updated' : 'Created'}` : `Unable To ${grade.edit ? 'Update' : 'Create'} Grade`, res.success ? 'info' : 'error');
		grade = null;
		if (res.success) fetchRoster(true);
	}

	async function confirmDeleteGrade() {
		if (!grade) return;
		deleteGradeConfirm = false;
		const res = await Nui.comanagerDeleteGrade({ JobId: grade.JobId, WorkplaceId: grade.WorkplaceId, Id: grade.Id ?? '' });
		pushAlert(res.success ? 'Grade Deleted' : 'Unable To Delete Grade', res.success ? 'info' : 'error');
		grade = null;
		if (res.success) fetchRoster(true);
	}

	function visiblePermissions(): string[] {
		if (!jobData) return [];
		return Object.keys(namedJobPerms)
			.filter((p) => {
				const restricted = namedJobPerms[p].restricted;
				return !restricted || restricted.includes(jobData.Id);
			})
			.sort();
	}

	// time worked
	let viewingTimeWorked = $state<TimeWorkedEntry | null>(null);

	function timeWorkedSummary(entry: TimeWorkedEntry): string {
		if (!jobId) return '0 Minutes';
		const entries = entry.TimeClockedOn?.[jobId] ?? [];
		const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
		const minutes = entries.filter((t) => t.time >= weekAgo).reduce((sum, t) => sum + t.minutes, 0);
		if (minutes <= 0) return '0 Minutes';
		if (minutes < 60) return `${minutes} Minutes`;
		return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
	}

	function lastDutySummary(entry: TimeWorkedEntry): string {
		if (!jobId) return 'Never';
		const ts = entry.LastClockOn?.[jobId];
		if (!ts) return 'Never';
		const diff = Math.max(0, Math.floor(Date.now() / 1000) - ts);
		if (diff < 3600) return `${Math.floor(diff / 60)}m Ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h Ago`;
		return `${Math.floor(diff / 86400)}d Ago`;
	}

	const gradesSorted = $derived([...(jobData?.Grades ?? [])].sort((a, b) => a.Level - b.Level));

	function permissionCount(g: JobGrade): number {
		return Object.values(g.Permissions ?? {}).filter(Boolean).length;
	}
</script>

{#if view === 'list'}
	<AppContainer appId="comanager" title="BizWiz">
		{#if myJobs.length === 0}
			<div class="empty">You're Not Employed At A Company</div>
		{:else}
			<div class="job-list">
				{#each myJobs as job (job.Id)}
					<button class="job-row" onclick={() => navigateToApp('comanager', `view/${job.Id}`)}>
						<span class="job-main">
							<span class="job-name">{job.Workplace ? job.Workplace.Name : job.Name}</span>
							<span class="job-sub">Employed As {job.Grade?.Name ?? 'Employee'}</span>
						</span>
						<Icon name="chevron-right" size="14px" />
					</button>
				{/each}
			</div>
		{/if}
	</AppContainer>
{:else if view === 'view'}
	<AppContainer appId="comanager" title={jobData ? (jobData.Workplaces ? jobData.Name : jobData.Name) : 'BizWiz'}>
		{#snippet actions()}
			{#if activeTab === 0}
				<button class="header-action" onclick={() => (viewingMine = true)} aria-label="My Employment"><Icon name="user" size="20px" /></button>
				{#if canHire}
					<button class="header-action" onclick={openHire} aria-label="Hire Employee"><Icon name="plus" size="20px" /></button>
				{/if}
			{:else if activeTab === 1 && jobData && !jobData.Workplaces}
				<button class="header-action" onclick={() => openCreateGrade(null)} aria-label="Create Grade"><Icon name="plus" size="20px" /></button>
			{/if}
			<button class="header-action" onclick={() => fetchRoster(true)} disabled={loading} aria-label="Refresh"><Icon name="arrows-rotate" size="20px" /></button>
		{/snippet}
		{#if !playerJobData || !jobData}
			<div class="empty">Error</div>
		{:else}
			<div class="tab-body">
				{#if loading && !roster}
					<Loader static text="Loading" />
				{:else if activeTab === 0}
					<!-- Roster -->
					{#if rosterForJob.length === 0}
						<div class="empty small">No Employees</div>
					{:else}
						<div class="employee-list">
							{#each [...rosterForJob].sort((a, b) => b.JobData.Grade.Level - a.JobData.Grade.Level) as employee (employee.SID)}
								<button class="employee-row" class:clickable={canEditEmployee(employee)} onclick={() => canEditEmployee(employee) && openEditEmployee(employee)}>
									<span class="employee-avatar"><Icon name="user" size="16px" /></span>
									<span class="employee-main">
										<span class="employee-name">
											{#if String(player?.SID) === String(employee.SID)}<Icon name="user" size="10px" />{:else if String(jobData.Owner) === String(employee.SID)}<Icon name="crown" size="10px" />{/if}
											{employee.First} {employee.Last}
										</span>
										<span class="employee-sub">{employee.JobData.Grade.Name} - {employee.Phone}</span>
									</span>
									{#if canEditEmployee(employee)}<Icon name="pen-to-square" size="13px" />{/if}
								</button>
							{/each}
						</div>
					{/if}
				{:else if activeTab === 1}
					<!-- Manage -->
					{#if jobData.Workplaces && jobData.Workplaces.length > 0}
						<div class="workplace-list">
							{#each jobData.Workplaces as wp (wp.Id)}
								<div class="workplace-card">
									<button class="workplace-summary" onclick={() => (expandedWorkplace = expandedWorkplace === wp.Id ? null : wp.Id)}>
										<span class="workplace-main">
											<span class="workplace-name">{wp.Name}</span>
											<span class="workplace-sub">{wp.Grades.length} Grades</span>
										</span>
										<Icon name={expandedWorkplace === wp.Id ? 'chevron-up' : 'chevron-down'} size="13px" />
									</button>
									{#if expandedWorkplace === wp.Id}
										<div class="workplace-actions">
											<button class="track-btn" onclick={() => openCreateGrade(wp.Id)}>Create Grade</button>
											<button class="track-btn" onclick={() => (grade = { edit: true, JobId: jobData.Id, WorkplaceId: wp.Id, Name: wp.Name, Level: 1, Permissions: {} })}>Edit Workplace</button>
										</div>
										<div class="grade-list">
											{#each [...wp.Grades].sort((a, b) => a.Level - b.Level) as g (g.Id)}
												<button class="grade-row" onclick={() => (g.Level < playerJobData.Grade.Level || isOwner) && openEditGrade(g, wp.Id)}>
													<span class="grade-main">
														<span class="grade-name">{#if g.Permissions?.JOB_MANAGEMENT}<Icon name="user-shield" size="10px" />{/if} {g.Name}</span>
														<span class="grade-sub">{permissionCount(g)} Permissions</span>
													</span>
												</button>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<div class="grade-list">
							{#each gradesSorted as g (g.Id)}
								<button class="grade-row" onclick={() => (g.Level < playerJobData.Grade.Level || isOwner) && openEditGrade(g, null)}>
									<span class="grade-main">
										<span class="grade-name">{#if g.Permissions?.JOB_MANAGEMENT}<Icon name="user-shield" size="10px" />{/if} {g.Name}</span>
										<span class="grade-sub">{permissionCount(g)} Permissions</span>
									</span>
								</button>
							{/each}
						</div>
					{/if}
				{:else if activeTab === 2}
					<!-- Time Worked -->
					{#if !timeWorked}
						<Loader static text="Loading" />
					{:else if timeWorked.length === 0}
						<div class="empty small">No Data</div>
					{:else}
						<div class="employee-list">
							{#each timeWorked as employee (employee.SID)}
								<button class="employee-row clickable" onclick={() => (viewingTimeWorked = employee)}>
									<span class="employee-avatar"><Icon name="user" size="16px" /></span>
									<span class="employee-main">
										<span class="employee-name">
											{#if String(player?.SID) === String(employee.SID)}<Icon name="user" size="10px" />{:else if String(jobData.Owner) === String(employee.SID)}<Icon name="crown" size="10px" />{/if}
											{employee.First} {employee.Last}
										</span>
										<span class="employee-sub">State ID: {employee.SID}</span>
									</span>
								</button>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
			<div class="tab-bar">
				<button class="tab-btn" class:active={activeTab === 0} onclick={() => switchTab(0)}>Roster</button>
				<button class="tab-btn" class:active={activeTab === 1} disabled={!canManage} onclick={() => switchTab(1)}>Manage</button>
				<button class="tab-btn" class:active={activeTab === 2} disabled={!canManage} onclick={() => switchTab(2)}>Time Worked</button>
			</div>
		{/if}
	</AppContainer>
{/if}

<Modal showing={hiring !== null} title={hiring?.edit ? 'Update Employment' : 'Hire Employee'} acceptLabel={hiring?.edit ? 'Save' : 'Hire'} onAccept={submitHire} onClose={() => (hiring = null)}>
	{#if hiring}
		<label class="field">
			<span>State ID</span>
			<input type="number" value={hiring.SID} disabled={hiring.edit} oninput={(e) => hiring && (hiring = { ...hiring, SID: (e.currentTarget as HTMLInputElement).value })} />
		</label>
		{#if jobData?.Workplaces}
			<label class="field">
				<span>Workplace</span>
				<Dropdown
					value={hiring.Job.Workplace?.Id ?? ''}
					options={jobData.Workplaces.map((wp) => ({ value: wp.Id, label: wp.Name }))}
					disabled={!canManage}
					onchange={(v) => setHireWorkplace(v as string)}
				/>
			</label>
		{/if}
		<label class="field">
			<span>Grade</span>
			<Dropdown
				value={hiring.Job.Grade.Id}
				options={[...(hiring.Job.Workplace ? hiring.Job.Workplace.Grades : (jobData?.Grades ?? []))]
					.sort((a, b) => a.Level - b.Level)
					.map((g) => ({ value: g.Id, label: g.Name, disabled: !isOwner && playerJobData ? playerJobData.Grade.Level <= g.Level : false }))}
				onchange={(v) => setHireGrade(v as string)}
			/>
		</label>
		{#if hiring.edit && String(hiring.SID) !== String(player?.SID) && (canManage || canFire)}
			<button type="button" class="danger-link" onclick={() => (firing = true)}>Fire Employee</button>
		{/if}
	{/if}
</Modal>

<Confirm showing={firing} title={`Fire ${hiring?.First} ${hiring?.Last}?`} onAccept={confirmFire} onDeny={() => (firing = false)} />

<Modal showing={viewingMine} title="My Employment" acceptLabel="Close" onAccept={() => (viewingMine = false)} onClose={() => (viewingMine = false)}>
	{#if playerJobData}
		<div class="detail-item"><span class="label">Job</span><span class="value">{playerJobData.Name}</span></div>
		{#if isOwner}<div class="detail-item"><span class="label">Owner</span><span class="value">You Are The Owner</span></div>{/if}
		{#if playerJobData.Workplace}<div class="detail-item"><span class="label">Workplace</span><span class="value">{playerJobData.Workplace.Name}</span></div>{/if}
		<div class="detail-item"><span class="label">Grade</span><span class="value">{playerJobData.Grade.Name}</span></div>
		{#if !isOwner}
			<button type="button" class="danger-link" onclick={() => (quitConfirm = true)}>Quit Job</button>
		{/if}
	{/if}
</Modal>

<Confirm showing={quitConfirm} title={`Quit ${jobData?.Name}?`} onAccept={submitQuit} onDeny={() => (quitConfirm = false)} />

<Modal showing={grade !== null} title={`${grade?.edit ? 'Edit' : 'Create'} Grade`} acceptLabel={grade?.edit ? 'Save' : 'Create'} onAccept={submitGrade} onClose={() => (grade = null)}>
	{#if grade}
		<label class="field">
			<span>Grade Name</span>
			<input value={grade.Name} oninput={(e) => grade && (grade = { ...grade, Name: (e.currentTarget as HTMLInputElement).value })} />
		</label>
		<label class="field">
			<span>Grade Level</span>
			<input type="number" value={grade.Level} disabled={Boolean(grade.Owner)} oninput={(e) => grade && (grade = { ...grade, Level: Number((e.currentTarget as HTMLInputElement).value) })} />
		</label>
		<div class="perm-list">
			<span class="perm-label">Permissions</span>
			{#each visiblePermissions() as key (key)}
				<label class="perm-row">
					<input type="checkbox" checked={Boolean(grade.Permissions[key])} disabled={Boolean(grade.Owner) || (!hasJobPerm(key) && !isOwner)} onchange={() => togglePermission(key)} />
					{namedJobPerms[key]?.name ?? key}
				</label>
			{/each}
		</div>
		{#if grade.edit && !grade.Owner}
			<button type="button" class="danger-link" onclick={() => (deleteGradeConfirm = true)}>Delete Grade</button>
		{/if}
	{/if}
</Modal>

<Confirm
	showing={deleteGradeConfirm}
	title="Delete Grade?"
	description="Deleting this grade removes all permissions tied to it and cannot be undone."
	onAccept={confirmDeleteGrade}
	onDeny={() => (deleteGradeConfirm = false)}
/>

<Modal showing={viewingTimeWorked !== null} title="View Time Worked" acceptLabel="Close" onAccept={() => (viewingTimeWorked = null)} onClose={() => (viewingTimeWorked = null)}>
	{#if viewingTimeWorked}
		<p class="tw-line">{viewingTimeWorked.First} {viewingTimeWorked.Last} ({viewingTimeWorked.SID})</p>
		<p class="tw-line">Last Went On Duty: {lastDutySummary(viewingTimeWorked)}</p>
		<p class="tw-line">Has Worked {timeWorkedSummary(viewingTimeWorked)} In The Last Week.</p>
	{/if}
</Modal>

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

	.empty {
		text-align: center;
		margin-top: 25%;
		font-size: 16px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.empty.small {
		margin-top: 10px;
		font-size: 13px;
	}

	.job-list {
		display: flex;
		flex-direction: column;
	}

	.job-row {
		width: 100%;
		background: none;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding: 12px 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		cursor: pointer;
		text-align: left;
		color: var(--color-text);
	}

	.job-row:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.job-main {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.job-name {
		font-size: 15px;
	}

	.job-sub {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.tab-body {
		height: calc(100% - 42px);
		overflow-y: auto;
		overflow-x: hidden;
	}

	.tab-bar {
		display: flex;
		height: 42px;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.tab-btn {
		flex: 1;
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.tab-btn.active {
		color: var(--color-primary);
		border-bottom: 2px solid var(--color-primary);
	}

	.tab-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.employee-list,
	.grade-list {
		display: flex;
		flex-direction: column;
	}

	.employee-row,
	.grade-row {
		width: 100%;
		background: none;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding: 10px 14px;
		display: flex;
		align-items: center;
		gap: 10px;
		text-align: left;
		color: var(--color-text);
		cursor: default;
	}

	.employee-row.clickable,
	.grade-row {
		cursor: pointer;
	}

	.employee-row:hover.clickable,
	.grade-row:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.employee-avatar {
		flex-shrink: 0;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--color-primary);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.employee-main,
	.grade-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: 2px;
	}

	.employee-name,
	.grade-name {
		font-size: 14px;
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.employee-sub,
	.grade-sub {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.workplace-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px;
	}

	.workplace-card {
		background: var(--color-bg-panel);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.workplace-summary {
		width: 100%;
		background: none;
		border: none;
		padding: 12px 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
		color: var(--color-text);
		gap: 10px;
	}

	.workplace-main {
		display: flex;
		flex-direction: column;
		gap: 2px;
		text-align: left;
	}

	.workplace-name {
		font-size: 14px;
	}

	.workplace-sub {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.workplace-actions {
		display: flex;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.track-btn {
		flex: 1;
		background: none;
		border: none;
		padding: 10px;
		font-size: 12px;
		color: var(--color-primary);
		cursor: pointer;
	}

	.track-btn:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 10px;
	}

	.field span {
		font-size: 12px;
		color: var(--color-text-alt);
	}

	.field input {
		background: transparent;
		border: var(--border-input);
		border-radius: var(--radius);
		padding: 8px 10px;
		font-size: 14px;
		color: var(--color-text);
		outline: none;
		font-family: inherit;
	}

	.field input:disabled {
		opacity: 0.5;
	}

	.perm-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 180px;
		overflow-y: auto;
		margin-bottom: 10px;
	}

	.perm-label {
		font-size: 12px;
		color: var(--color-text-alt);
		margin-bottom: 2px;
	}

	.perm-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--color-text);
	}

	.danger-link {
		background: none;
		border: none;
		color: var(--color-error-light, var(--color-error));
		font-size: 13px;
		cursor: pointer;
		padding: 6px 0;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		padding: 6px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.label {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.value {
		font-size: 14px;
		color: var(--color-text);
	}

	.tw-line {
		font-size: 13px;
		color: var(--color-text);
		margin: 4px 0;
	}
</style>
