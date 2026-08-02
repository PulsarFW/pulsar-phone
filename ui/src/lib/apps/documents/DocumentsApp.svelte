<!-- documents: list, create, view, edit, sign, share. Content is a plain multi-line text field, not a
	 rich-text editor - covers write/view/sign without a heavy editor dependency. -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Loader from '../../primitives/Loader.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import Confirm from '../../primitives/Confirm.svelte';
	import AppInput from '../../primitives/AppInput.svelte';
	import Dropdown from '../../primitives/Dropdown.svelte';
	import { dataState } from '../../store/data.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { DocumentSigner, PhoneDocument } from '../../types';

	const appColor = $derived(dataState.appRegistry['documents']?.color ?? '#820366');

	const view = $derived(
		navState.route === 'new'
			? 'new'
			: navState.route.startsWith('edit/')
				? 'edit'
				: navState.route.startsWith('view/')
					? 'view'
					: 'list',
	);
	const targetId = $derived.by(() => {
		if (view === 'edit') return Number(navState.route.slice('edit/'.length));
		if (view === 'view') return Number(navState.route.slice('view/'.length));
		return null;
	});

	const documents = $derived([...(dataState.myDocuments as unknown as PhoneDocument[])].sort((a, b) => b.time - a.time));
	const viewedDoc = $derived(documents.find((d) => d.id === targetId));

	function timeAgo(unixSeconds: number): string {
		const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return `${Math.floor(diff / 86400)}d ago`;
	}

	// create/edit form
	let formTitle = $state('');
	let formContent = $state('');
	let submitting = $state(false);

	$effect(() => {
		if (view === 'new') {
			formTitle = '';
			formContent = '';
		} else if (view === 'edit' && viewedDoc) {
			formTitle = viewedDoc.title;
			formContent = viewedDoc.content;
		}
	});

	async function createDocument() {
		if (!formTitle.trim() || !formContent.trim()) return;
		submitting = true;
		const res = await Nui.documentsCreate(formTitle.trim(), formContent.trim());
		submitting = false;
		if (res) {
			dataState.myDocuments = [...dataState.myDocuments, res as unknown as Record<string, unknown>];
			pushAlert('Document Created Successfully');
			navigateToApp('documents', `view/${res.id}`);
		} else {
			pushAlert('Failed Creating Document', 'error');
		}
	}

	async function saveEdit() {
		if (!viewedDoc || !formTitle.trim() || !formContent.trim()) return;
		submitting = true;
		const ok = await Nui.documentsEdit(viewedDoc.id, formTitle.trim(), formContent.trim());
		submitting = false;
		if (ok) {
			dataState.myDocuments = dataState.myDocuments.map((d) =>
				(d as unknown as PhoneDocument).id === viewedDoc.id ? { ...d, title: formTitle.trim(), content: formContent.trim() } : d,
			);
			pushAlert('Document Updated');
			navigateToApp('documents', `view/${viewedDoc.id}`);
		} else {
			pushAlert('Failed Updating Document', 'error');
		}
	}

	// delete
	let deleting = $state(false);
	async function confirmDelete() {
		if (!viewedDoc) return;
		deleting = false;
		const ok = await Nui.documentsDelete(viewedDoc.id);
		if (ok) {
			dataState.myDocuments = dataState.myDocuments.filter((d) => (d as unknown as PhoneDocument).id !== viewedDoc.id);
			pushAlert('Document Deleted Successfully');
			navigateToApp('documents');
		} else {
			pushAlert('Failed Deleting Document', 'error');
		}
	}

	// signing
	let signing = $state(false);
	async function signDocument() {
		if (!viewedDoc) return;
		signing = true;
		const ok = await Nui.documentsSign(viewedDoc.id);
		signing = false;
		if (ok) {
			dataState.myDocuments = dataState.myDocuments.map((d) => ((d as unknown as PhoneDocument).id === viewedDoc.id ? { ...d, signed: Math.floor(Date.now() / 1000) } : d));
			pushAlert('Document Signed');
		} else {
			pushAlert('Unable To Sign Document', 'error');
		}
	}

	// signatures
	let viewingSignatures = $state(false);
	let loadingSigs = $state(false);
	let signers = $state<DocumentSigner[]>([]);

	async function openSignatures() {
		if (!viewedDoc) return;
		viewingSignatures = true;
		loadingSigs = true;
		const res = await Nui.documentsGetSignatures(viewedDoc.id);
		signers = res || [];
		loadingSigs = false;
	}

	// share
	let sharing = $state(false);
	let shareTarget = $state('');
	let shareType = $state<1 | 2 | 3>(1);

	function openShare() {
		shareTarget = '';
		shareType = 1;
		sharing = true;
	}

	async function confirmShare() {
		if (!viewedDoc || !shareTarget.trim()) return;
		sharing = false;
		const ok = await Nui.documentsShare(viewedDoc.id, Number(shareTarget), shareType);
		pushAlert(ok ? 'Document Shared' : 'Unable To Share Document', ok ? undefined : 'error');
	}
</script>

{#if view === 'list'}
	<AppContainer appId="documents" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('documents', 'new')} aria-label="Create Document"><Icon name="plus" size="20px" /></button>
		{/snippet}
		{#if documents.length === 0}
			<div class="empty">No Documents</div>
		{:else}
			<div class="list">
				{#each documents as doc (doc.id)}
					<button class="doc-row" onclick={() => navigateToApp('documents', `view/${doc.id}`)}>
						<span class="doc-icon" style:color={appColor}><Icon name="file-lines" size="18px" /></span>
						<span class="doc-main">
							<span class="doc-title">{doc.title}</span>
							<span class="doc-sub">Last Edited {timeAgo(doc.time)}</span>
						</span>
						{#if doc.signature_required && !doc.signed}
							<Icon name="signature" size="14px" />
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</AppContainer>
{:else if view === 'new'}
	<AppContainer appId="documents" title="Create New Document" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={createDocument} disabled={submitting || !formTitle.trim() || !formContent.trim()} aria-label="Save">
				<Icon name="floppy-disk" size="20px" />
			</button>
		{/snippet}
		<div class="form">
			{#if submitting}
				<Loader static text="Submitting Document" />
			{/if}
			<AppInput label="Title" bind:value={formTitle} accent={appColor} maxlength={100} />
			<label class="content-field">
				<span>Content</span>
				<textarea bind:value={formContent} placeholder="Write Stuff Here" rows={12}></textarea>
			</label>
		</div>
	</AppContainer>
{:else if view === 'edit' && viewedDoc}
	<AppContainer appId="documents" title={`Edit ${viewedDoc.title}`} useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={saveEdit} disabled={submitting || !formTitle.trim() || !formContent.trim()} aria-label="Save">
				<Icon name="floppy-disk" size="20px" />
			</button>
		{/snippet}
		<div class="form">
			{#if submitting}
				<Loader static text="Submitting Document" />
			{/if}
			<AppInput label="Title" bind:value={formTitle} accent={appColor} maxlength={100} />
			<label class="content-field">
				<span>Content</span>
				<textarea bind:value={formContent} placeholder="Write Stuff Here" rows={12}></textarea>
			</label>
		</div>
	</AppContainer>
{:else if view === 'view'}
	<AppContainer appId="documents" title={viewedDoc?.title ?? 'Invalid Document'} useAppColor={true}>
		{#snippet actions()}
			{#if viewedDoc && viewedDoc.sid === dataState.player?.SID}
				<button class="header-action" onclick={() => navigateToApp('documents', `edit/${viewedDoc!.id}`)} aria-label="Edit"><Icon name="pen-to-square" size="20px" /></button>
			{/if}
			{#if viewedDoc}
				<button class="header-action" onclick={() => (deleting = true)} aria-label="Delete"><Icon name="trash-can" size="20px" /></button>
				<button class="header-action" onclick={openSignatures} aria-label="View Signatures"><Icon name="signature" size="20px" /></button>
				<button class="header-action" onclick={openShare} aria-label="Share"><Icon name="share" size="20px" /></button>
			{/if}
		{/snippet}
		{#if viewedDoc}
			<div class="doc-body">
				<div class="doc-content">{viewedDoc.content}</div>
			</div>
			{#if viewedDoc.signature_required}
				<label class="sign-row">
					<input type="checkbox" disabled={Boolean(viewedDoc.signed) || signing} checked={Boolean(viewedDoc.signed)} onchange={signDocument} />
					{viewedDoc.signed ? `Document Signed (as ${viewedDoc.signed_name ?? ''})` : 'Sign Document'}
				</label>
			{/if}
		{:else}
			<div class="empty">Document Doesn't Exist</div>
		{/if}
	</AppContainer>
{/if}

<Confirm showing={deleting} title="Delete Document?" acceptLabel="Yes" denyLabel="No" onAccept={confirmDelete} onDeny={() => (deleting = false)} />

<Modal showing={viewingSignatures} title="Document Signatures" acceptLabel="Close" closeLabel="Close" onAccept={() => (viewingSignatures = false)} onClose={() => (viewingSignatures = false)}>
	{#if loadingSigs}
		<Loader text="Loading Signers" />
	{:else if signers.length === 0}
		<p>No signatures yet.</p>
	{:else}
		{#each signers as s (s.sid)}
			<p>{s.signed_name} (State ID: {s.sid}) {s.signed ? `signed` : 'Not Yet Signed'}</p>
		{/each}
	{/if}
</Modal>

<Modal showing={sharing} title="Share This Document" acceptLabel="Share" closeLabel="Cancel" onAccept={confirmShare} onClose={() => (sharing = false)}>
	<p>Sharing without making a copy will allow the recipient to see any changes you make to the document.</p>
	<label class="content-field">
		<span>Share Type</span>
		<Dropdown
			bind:value={shareType}
			options={[
				{ value: 1, label: 'Share a Copy' },
				{ value: 2, label: 'Share', disabled: !viewedDoc || viewedDoc.sid !== dataState.player?.SID },
				{ value: 3, label: 'Share w/ Signature Request', disabled: !viewedDoc || viewedDoc.sid !== dataState.player?.SID },
			]}
		/>
	</label>
	<AppInput label="State ID" bind:value={shareTarget} type="tel" maxlength={6} />
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
		cursor: default;
	}

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

	.doc-row {
		display: flex;
		align-items: center;
		gap: 12px;
		background: var(--color-bg-panel);
		border: none;
		border-radius: 12px;
		padding: 12px 14px;
		box-shadow: var(--shadow-card);
		cursor: pointer;
		text-align: left;
	}

	.doc-icon {
		flex-shrink: 0;
	}

	.doc-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.doc-title {
		font-size: 14.5px;
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.doc-sub {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.form {
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.content-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.content-field span {
		font-size: 12px;
		color: var(--color-text-alt);
	}

	.content-field textarea {
		background: var(--color-bg-panel);
		border: var(--border-input);
		border-radius: var(--radius);
		padding: 10px;
		font-size: 14px;
		color: var(--color-text);
		resize: none;
		font-family: inherit;
	}


	.doc-body {
		padding: 14px 20px;
		height: 100%;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.doc-content {
		font-size: 14px;
		line-height: 1.6;
		color: var(--color-text);
		white-space: pre-wrap;
		overflow-wrap: break-word;
	}

	.sign-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 20px;
		font-size: 13px;
		color: var(--color-text);
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}
</style>
