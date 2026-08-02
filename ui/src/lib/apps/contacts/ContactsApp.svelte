<!-- contact list, add-by-number, unknown-caller quick view, contact detail/edit -->
<script lang="ts">
	import AppContainer from '../../primitives/AppContainer.svelte';
	import Icon from '../../components/Icon.svelte';
	import Modal from '../../primitives/Modal.svelte';
	import Confirm from '../../primitives/Confirm.svelte';
	import { dataState } from '../../store/data.svelte';
	import { navState, navigateToApp } from '../../store/nav.svelte';
	import { phoneState } from '../../store/phone.svelte';
	import { pushAlert } from '../../store/alerts.svelte';
	import { Nui } from '../../nui';
	import type { Contact } from '../../types';

	const RANDOM_COLORS = ['#21a500', '#ff6a00', '#10909c', '#8800c7', '#c4b404', '#268f3a', '#9d1614'];
	function randomColor(): string {
		return RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
	}

	const view = $derived(
		navState.route === 'add' ? 'add' : navState.route.startsWith('view/') ? 'view' : navState.route.startsWith('caller/') ? 'caller' : 'list',
	);
	const targetId = $derived(navState.route.startsWith('view/') ? Number(navState.route.slice('view/'.length)) : null);
	const targetNumber = $derived(navState.route.startsWith('caller/') ? navState.route.slice('caller/'.length) : '');

	function formatNumber(raw: string): string | null {
		const digits = raw.replace(/\D/g, '');
		if (digits.length !== 10) return null;
		return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
	}

	// list
	let search = $state('');
	const filtered = $derived(
		[...dataState.contacts]
			.filter((c) => !search || c.name.toUpperCase().includes(search.toUpperCase()) || c.number.replace(/-/g, '').includes(search.replace(/\D/g, '')))
			.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name)),
	);
	let deleteTarget = $state<Contact | null>(null);

	async function confirmDelete() {
		if (!deleteTarget) return;
		const id = deleteTarget.id;
		deleteTarget = null;
		const ok = await Nui.deleteContact(id);
		if (ok) {
			dataState.contacts = dataState.contacts.filter((c) => c.id !== id);
			pushAlert('Contact Deleted');
			if (view === 'view' && targetId === id) navigateToApp('contacts');
		} else {
			pushAlert('Failed Deleting Contact', 'error');
		}
	}

	// add
	let addNumber = $state('');
	function onAddSubmit() {
		const formatted = formatNumber(addNumber);
		if (!formatted) {
			pushAlert('Not A Valid Number', 'error');
			return;
		}
		const existing = dataState.contacts.find((c) => c.number === formatted);
		navigateToApp('contacts', existing ? `view/${existing.id}` : `caller/${formatted}`);
	}

	// caller / edit modal shared
	let editing = $state(false);
	let editName = $state('');
	let editNumber = $state('');
	let editFavorite = $state(false);

	function openCreate() {
		editName = '';
		editNumber = targetNumber;
		editFavorite = false;
		editing = true;
	}

	function openEdit(contact: Contact) {
		editName = contact.name;
		editNumber = contact.number;
		editFavorite = contact.favorite;
		editing = true;
	}

	async function saveCreate() {
		if (!editName.trim()) {
			pushAlert('Name Is Required', 'error');
			return;
		}
		editing = false;
		const color = randomColor();
		const id = await Nui.createContact({ number: editNumber, name: editName.trim(), favorite: editFavorite, color });
		if (id) {
			dataState.contacts = [...dataState.contacts, { id, sid: 0, number: editNumber, name: editName.trim(), favorite: editFavorite, color }];
			pushAlert('Contact Saved');
			navigateToApp('contacts', `view/${id}`);
		} else {
			pushAlert('Failed Creating Contact', 'error');
		}
	}

	async function saveEdit(contact: Contact) {
		editing = false;
		const patch = { id: contact.id, name: editName.trim(), number: editNumber, favorite: editFavorite };
		const ok = await Nui.updateContact(patch);
		if (ok) {
			dataState.contacts = dataState.contacts.map((c) => (c.id === contact.id ? { ...c, ...patch } : c));
			pushAlert('Contact Updated');
		} else {
			pushAlert('Failed Updating Contact', 'error');
		}
	}

	const viewedContact = $derived(dataState.contacts.find((c) => c.id === targetId));

	async function callNumber(number: string) {
		if (phoneState.call) return;
		const ok = await Nui.createCall(number);
		if (ok) navigateToApp('phone', `call/${number}`);
		else pushAlert('Unable To Start Call', 'error');
	}
</script>

{#if view === 'list'}
	<AppContainer appId="contacts" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('contacts', 'add')} aria-label="Add Contact"><Icon name="plus" size="20px" /></button>
		{/snippet}
		{#if dataState.contacts.length === 0}
			<div class="empty">You Have No Contacts</div>
		{:else}
			<div class="search-wrap">
				<input class="search-input" placeholder="Search Contacts" bind:value={search} />
			</div>
			{#each filtered as contact (contact.id)}
				<div class="contact-row">
					<button class="contact-main" onclick={() => navigateToApp('contacts', `view/${contact.id}`)}>
						<span class="avatar" style:background={contact.color ?? '#333'}>{contact.name.charAt(0)}</span>
						<span class="contact-text">
							<span class="contact-name">{contact.name}</span>
							<span class="contact-number">{contact.number}</span>
						</span>
						{#if contact.favorite}<Icon name="star" size="14px" />{/if}
					</button>
					<button class="delete-btn" onclick={() => (deleteTarget = contact)} aria-label="Delete"><Icon name="trash" size="14px" /></button>
				</div>
			{/each}
		{/if}
	</AppContainer>
{:else if view === 'add'}
	<AppContainer appId="contacts" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={() => navigateToApp('contacts')} aria-label="Cancel"><Icon name="xmark" size="20px" /></button>
		{/snippet}
		<div class="add-form">
			<input class="search-input" placeholder="___-___-____" bind:value={addNumber} onkeydown={(e) => e.key === 'Enter' && onAddSubmit()} />
			<button class="save-btn" onclick={onAddSubmit}>Continue</button>
		</div>
	</AppContainer>
{:else if view === 'caller'}
	<AppContainer appId="contacts" useAppColor={true}>
		{#snippet actions()}
			<button class="header-action" onclick={openCreate} aria-label="Save As Contact"><Icon name="floppy-disk" size="20px" /></button>
		{/snippet}
		<div class="detail">
			<div class="avatar large">?</div>
			<div class="detail-name">Unknown Number</div>
			<div class="detail-number">{targetNumber}</div>
			<div class="detail-actions">
				<button class="button" onclick={() => callNumber(targetNumber)} aria-label="Call"><Icon name="phone" size="22px" /></button>
				<button class="button" onclick={() => navigateToApp('messages', `convo/${targetNumber}`)} aria-label="Text"><Icon name="comment" size="22px" /></button>
			</div>
		</div>
	</AppContainer>
{:else if view === 'view'}
	{#if viewedContact}
		<AppContainer appId="contacts" colorOverride={viewedContact.color ?? undefined}>
			{#snippet actions()}
				<button class="header-action" onclick={() => (deleteTarget = viewedContact)} aria-label="Delete Contact"><Icon name="trash" size="20px" /></button>
				<button class="header-action" onclick={() => openEdit(viewedContact)} aria-label="Edit Details"><Icon name="pen-to-square" size="20px" /></button>
			{/snippet}
			<div class="detail">
				<div class="avatar large" style:background={viewedContact.color ?? '#333'}>{viewedContact.name.charAt(0)}</div>
				<div class="detail-name">{viewedContact.name}</div>
				<div class="detail-number">{viewedContact.number}</div>
				<div class="detail-actions">
					<button class="button" onclick={() => callNumber(viewedContact!.number)} aria-label="Call"><Icon name="phone" size="22px" /></button>
					<button class="button" onclick={() => navigateToApp('messages', `convo/${viewedContact!.number}`)} aria-label="Text">
						<Icon name="comment" size="22px" />
					</button>
				</div>
			</div>
		</AppContainer>
	{/if}
{/if}

<Confirm
	showing={deleteTarget !== null}
	title="Delete Contact"
	description={deleteTarget ? `Remove ${deleteTarget.name} from your contacts?` : ''}
	onAccept={confirmDelete}
	onDeny={() => (deleteTarget = null)}
/>

<Modal
	showing={editing}
	title={view === 'caller' ? 'Create New Contact' : 'Edit Contact'}
	onAccept={() => (view === 'caller' ? saveCreate() : viewedContact && saveEdit(viewedContact))}
	onClose={() => (editing = false)}
>
	<label class="modal-field">
		<span>Name</span>
		<input bind:value={editName} maxlength={32} />
	</label>
	<label class="modal-field">
		<span>Number</span>
		<input bind:value={editNumber} maxlength={12} />
	</label>
	<label class="modal-checkbox">
		<input type="checkbox" bind:checked={editFavorite} />
		<span>Favorite</span>
	</label>
</Modal>

<style>
	.header-action {
		background: none;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		padding: 6px 9px;
	}

	.empty {
		text-align: center;
		margin-top: 25%;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.search-wrap {
		padding: 10px 12px;
	}

	.search-input {
		width: 100%;
		background: rgba(255, 255, 255, 0.06);
		border: var(--border-input);
		border-radius: 20px;
		padding: 10px 14px;
		color: var(--color-text);
		font-size: 14px;
		outline: none;
	}

	.contact-row {
		display: flex;
		align-items: center;
		background: var(--color-bg-panel);
		box-shadow: var(--shadow-card);
		margin: 4px 6px;
		border-radius: var(--radius);
		overflow: hidden;
	}

	.contact-main {
		flex: 1;
		background: none;
		border: none;
		padding: 10px 12px;
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
		text-align: left;
		min-width: 0;
	}

	.contact-main:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.avatar {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-weight: 700;
	}

	.avatar.large {
		width: 110px;
		height: 110px;
		font-size: 44px;
		margin: 0 auto;
	}

	.contact-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.contact-name {
		font-size: 15px;
		color: var(--color-text);
	}

	.contact-number {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.delete-btn {
		background: none;
		border: none;
		color: var(--color-error-light);
		cursor: pointer;
		padding: 0 14px;
	}

	.add-form {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.save-btn {
		background: var(--color-primary);
		color: var(--color-primary-contrast);
		border: none;
		border-radius: var(--radius);
		padding: 10px;
		cursor: pointer;
		font-size: 14px;
	}

	.detail {
		text-align: center;
		margin-top: 40px;
		position: relative;
	}

	.detail-name {
		font-size: 20px;
		font-weight: 700;
		color: var(--color-text);
		margin-top: 12px;
	}

	.detail-number {
		font-size: 14px;
		color: var(--color-text-alt);
	}

	.detail-actions {
		display: flex;
		justify-content: center;
		gap: 24px;
		margin-top: 60px;
	}

	.button {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		border: none;
		color: var(--color-text);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.modal-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.modal-field span {
		font-size: 12px;
		color: var(--color-text-alt);
	}

	.modal-field input {
		background: transparent;
		border: var(--border-input);
		border-radius: var(--radius);
		padding: 8px 10px;
		font-size: 14px;
		color: var(--color-text);
	}

	.modal-checkbox {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--color-text-alt);
	}
</style>
