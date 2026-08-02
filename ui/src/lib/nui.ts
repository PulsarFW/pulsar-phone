import type {
	Advert,
	BankAccountsData,
	BankLoansData,
	BankTransaction,
	ChatterGroup,
	ChatterMessage,
	ChopperDetails,
	ComanagerActionResult,
	Contact,
	CreditCheckResult,
	CryptoCoin,
	DocumentSigner,
	CurrentFurnitureResult,
	Dyn8Property,
	FurnitureItem,
	GarageVehicle,
	HomeActionResult,
	HomeProperty,
	JobData,
	JobWorkplace,
	LaborDetails,
	LoanPaymentResult,
	MediaItem,
	MessageText,
	PDRace,
	PhoneDocument,
	PropertyUpgradesForType,
	RedlineRace,
	RosterEmployee,
	ServiceEntry,
	TimeWorkedEntry,
	Tweet,
	Workgroup,
} from './types';
import {
	MOCK_TEXTS,
	MOCK_THREADS,
	MOCK_MEDIA,
	MOCK_SERVICES,
	MOCK_CRYPTO_COINS,
	MOCK_CHOPPER,
	MOCK_PROPERTIES,
	MOCK_VEHICLES,
	MOCK_LOANS,
	MOCK_TWEETS,
	MOCK_BANK_ACCOUNTS,
	MOCK_TRANSACTIONS,
	MOCK_LABOR,
	MOCK_CHATTER_MESSAGES,
	MOCK_PD_RACES,
	MOCK_ROSTER,
	MOCK_TIME_WORKED,
	MOCK_HOME_PROPERTIES,
	MOCK_HOME_UPGRADES,
	MOCK_FURNITURE,
	MOCK_REDLINE_RACES,
} from './mockData';

const RESOURCE_NAME = 'pulsar_phone';

async function send(event: string, data: unknown = {}): Promise<void> {
	if (import.meta.env.DEV) {
		window.dispatchEvent(new CustomEvent('nui:send', { detail: { event, data } }));
		return;
	}
	try {
		await fetch(`https://${RESOURCE_NAME}/${event}`, {
			method: 'post',
			headers: { 'Content-Type': 'application/json; charset=UTF-8' },
			body: JSON.stringify(data),
		});
	} catch {
		// Expected to fail outside the actual NUI browser
	}
}

async function sendJson<T>(event: string, data: unknown, devValue: T): Promise<T> {
	if (import.meta.env.DEV) {
		window.dispatchEvent(new CustomEvent('nui:send', { detail: { event, data } }));
		return devValue;
	}
	try {
		const res = await fetch(`https://${RESOURCE_NAME}/${event}`, {
			method: 'post',
			headers: { 'Content-Type': 'application/json; charset=UTF-8' },
			body: JSON.stringify(data),
		});
		return (await res.json()) as T;
	} catch {
		return devValue;
	}
}

export const Nui = {
	// shell
	close: () => send('ClosePhone'),
	cdExpired: () => send('CDExpired'),
	savePosition: (x: number, y: number) => send('Phone:SavePosition', { x, y }),
	acceptPopup: (event: string, data: unknown) => send('AcceptPopup', { event, data }),
	cancelPopup: (event: string, data: unknown) => send('CancelPopup', { event, data }),
	shareMyContact: () => send('ShareMyContact'),
	saveShare: (type: 'contacts' | 'documents', data: unknown) => sendJson<unknown>('SaveShare', { type, data }, null),

	// home screen / app store
	setHome: (app: string, action: 'add' | 'remove') => send('Home', { app, action }),
	setDock: (app: string, action: 'add' | 'remove') => send('Dock', { app, action }),
	reorder: (type: 'home' | 'dock' | 'installed', apps: string[]) => send('Reorder', { type, apps }),
	updateAlias: (app: string, alias: unknown, unique?: boolean) => sendJson('UpdateAlias', { app, alias, unique }, true),
	// server/main.lua's "Phone:UpdateProfile" reads data.app/data.name/data.picture as flat top-level
	// fields, not a nested "data" object - the payload shape matters here, don't nest it back
	updateProfile: (app: string, data: Record<string, unknown>) => sendJson('UpdateProfile', { app, ...data }, true),
	installCheck: (app: string) => sendJson('Install', { app, check: true }, true),
	install: (app: string) => sendJson('Install', { app, check: false }, true),
	uninstallCheck: (app: string) => sendJson('Uninstall', { app, check: true }, true),
	uninstall: (app: string) => sendJson('Uninstall', { app, check: false }, true),
	// keyed by app name, only present for restricted apps - true if the player currently
	// meets the restriction (job/state/reputation/etc), recomputed fresh on each call
	getStoreCatalog: () => sendJson<Record<string, boolean>>('Store:GetCatalog', {}, {}),

	// settings
	updateSetting: (type: string, val: unknown) => send('UpdateSetting', { type, val }),
	testSound: (val: string) => send('TestSound', { val }),

	// phone / dialer
	createCall: (number: string) => sendJson('CreateCall', { number }, true),
	acceptCall: () => send('AcceptCall'),
	endCall: () => send('EndCall'),
	readCalls: () => send('ReadCalls'),

	// messages
	messagesInitLoad: () => sendJson('Messages:InitLoad', {}, MOCK_THREADS),
	messagesLoadTexts: (number: string, offset: number) => sendJson<MessageText[] | false>('Messages:LoadTexts', { number, offset }, MOCK_TEXTS),
	sendMessage: (owner: string, number: string, message: string, time: number) =>
		sendJson<number | null>('SendMessage', { owner, number, message, time }, Date.now()),
	readConvo: (number: string) => send('ReadConvo', number),
	deleteConvo: (number: string) => sendJson('DeleteConvo', number, true),

	// contacts
	createContact: (data: Omit<Contact, 'id' | 'sid'>) => sendJson<number | null>('CreateContact', data, Date.now()),
	updateContact: (data: Partial<Contact> & { id: number }) => sendJson('UpdateContact', data, true),
	deleteContact: (id: number) => sendJson('DeleteContact', id, true),

	// media
	mediaGetMedia: () => sendJson<MediaItem[] | false>('Media:GetMedia', {}, MOCK_MEDIA),
	mediaDeleteMedia: (id: number) => sendJson<boolean>('Media:DeleteMedia', { id }, true),

	// services
	servicesGetServices: () => sendJson<ServiceEntry[] | false>('Services:GetServices', {}, MOCK_SERVICES),
	servicesSetGPS: (location: { x: number; y: number; z: number }, jobName: string) =>
		sendJson<boolean>('Services:SetGPS', { location, jobName }, true),

	// crypto
	cryptoGetCoins: () => sendJson<CryptoCoin[] | false>('GetCryptoCoins', {}, MOCK_CRYPTO_COINS),
	cryptoBuy: (short: string, quantity: number) => sendJson<boolean>('BuyCrypto', { Short: short, Quantity: quantity }, true),
	cryptoSell: (short: string, quantity: number) => sendJson<boolean>('SellCrypto', { Short: short, Quantity: quantity }, true),
	cryptoTransfer: (short: string, quantity: number, target: string) =>
		sendJson<boolean>('TransferCrypto', { Short: short, Quantity: quantity, Target: target }, true),

	// chopper
	chopperGetDetails: () => sendJson<ChopperDetails | false>('GetChopperDetails', {}, MOCK_CHOPPER),

	// pingem
	pingemSend: (target: number, anon: boolean) => sendJson<boolean>('PingEm:Send', { target, type: anon }, true),

	// dyn8
	dyn8Search: (term: string) => sendJson<Dyn8Property[] | false>('Dyn8:SearchProperty', term, MOCK_PROPERTIES),
	dyn8MarkProperty: (id: number) => sendJson<boolean>('Dyn8:MarkProperty', id, true),
	dyn8SellProperty: (property: number, target: number, loan: boolean, deposit: number, time: number) =>
		sendJson<{ error?: boolean; code?: number } | 'OK'>('Dyn8:SellProperty', { property, target, loan, deposit, time }, 'OK'),
	dyn8CheckCredit: (target: number) => sendJson<CreditCheckResult | false>('Dyn8:CheckCredit', { target }, false),

	// garage
	garageGetCars: () => sendJson<GarageVehicle[] | false>('Garage:GetCars', {}, MOCK_VEHICLES),
	garageTrackVehicle: (vin: string) => sendJson<boolean>('Garage:TrackVehicle', vin, true),

	// loans
	loansGetData: () => sendJson<BankLoansData | false>('Loans:GetData', {}, MOCK_LOANS),
	loansPayment: (loan: string, weeks: number, paymentAhead: boolean) =>
		sendJson<LoanPaymentResult>('Loans:Payment', { loan, weeks, paymentAhead }, { success: true, paymentAmount: 250 }),

	// documents
	documentsCreate: (title: string, content: string) => sendJson<PhoneDocument | false>('CreateDocument', { title, content }, false),
	documentsEdit: (id: number, title: string, content: string) => sendJson<boolean>('EditDocument', { id, title, content }, true),
	documentsDelete: (id: number) => sendJson<boolean>('DeleteDocument', { id }, true),
	documentsShare: (documentId: number, target: number, type: 1 | 2 | 3) =>
		sendJson<boolean>('ShareDocument', { document: documentId, target, type, nearby: false }, true),
	documentsSign: (id: number) => sendJson<boolean>('SignDocument', id, true),
	documentsGetSignatures: (id: number) => sendJson<DocumentSigner[] | false>('Documents:GetSignatures', id, []),

	// twitter / spammer
	twitterGetCount: () => sendJson<number | false>('Twitter:GetCount', {}, MOCK_TWEETS.length),
	twitterGetTweets: (offset: number) => sendJson<Tweet[] | false>('Twitter:GetTweets', offset, offset === 0 ? MOCK_TWEETS : []),
	twitterSendTweet: (tweet: Partial<Tweet>) => sendJson<Tweet | false>('SendTweet', tweet, { id: Date.now(), likes: [], ...tweet } as Tweet),

	// bank
	bankGetData: () => sendJson<BankAccountsData | false>('Banking:GetData', {}, MOCK_BANK_ACCOUNTS),
	bankTransfer: (account: string, targetType: boolean, target: string, amount: number, description: string) =>
		sendJson<boolean>('Banking:Transfer', { account, targetType, target, amount, description }, true),
	bankGetTransactions: (account: string, offset: number, perPage: number) =>
		sendJson<{ data: BankTransaction[]; more: boolean }>('Banking:GetTransactions', { account, offset, perPage }, { data: offset === 0 ? MOCK_TRANSACTIONS : [], more: false }),
	bankAcceptBill: (bill: number, account: string) => sendJson<boolean>('Banking:AcceptBill', { bill, account }, true),
	bankDismissBill: (bill: number) => sendJson<boolean>('Banking:DismissBill', { bill }, true),
	bankCreateBill: (fromAccount: string, target: string, description: string, amount: number) =>
		sendJson<boolean>('Banking:Bill', { fromAccount, target, description, amount }, true),

	// adverts - fire-and-forget: client/apps/adverts.lua's cb("OK") fires instantly regardless of the real
	// server-side outcome, the actual create/update/delete arrives later as an ADD/UPDATE/REMOVE_DATA push
	advertsCreate: (advert: Omit<Advert, 'id'> & { id: number }) => send('CreateAdvert', advert),
	advertsUpdate: (advert: Advert) => send('UpdateAdvert', advert),
	advertsDelete: () => send('DeleteAdvert', {}),

	// labor
	laborGetDetails: () => sendJson<LaborDetails | false>('GetLaborDetails', {}, MOCK_LABOR),
	laborCreateWorkgroup: () => sendJson<boolean>('CreateWorkgroup', {}, true),
	laborJoinWorkgroup: (group: Workgroup) => sendJson<boolean>('JoinWorkgroup', group, true),
	laborDisbandWorkgroup: () => sendJson<boolean>('DisbandWorkgroup', {}, true),
	laborLeaveWorkgroup: (group: Workgroup) => sendJson<boolean>('LeaveWorkgroup', group, true),
	laborStartJob: (job: string, isWorkgroup: boolean) => sendJson<boolean>('StartLaborJob', { job, isWorkgroup }, true),
	laborQuitJob: (job: string) => sendJson<boolean>('QuitLaborJob', job, true),

	// chatter
	chatterCreateGroup: (label: string) =>
		sendJson<{ id: number; create_date: number } | false>('Chatter:CreateGroup', { label }, { id: Date.now(), create_date: Math.floor(Date.now() / 1000) }),
	chatterGetMessageCount: (channel: number) => sendJson<number | false>('Chatter:GetMessageCount', channel, MOCK_CHATTER_MESSAGES.length),
	chatterLoadMessages: (channel: number, offset: number) =>
		sendJson<ChatterMessage[] | false>('Chatter:LoadMessages', { channel, offset }, offset === 0 ? MOCK_CHATTER_MESSAGES : []),
	chatterSendMessage: (channel: number, message: string) => sendJson<boolean>('Chatter:SendMessage', { channel, message }, true),
	chatterLeaveGroup: (channel: number) => sendJson<number | false>('Chatter:LeaveGroup', channel, channel),
	chatterDeleteGroup: (channel: number) => sendJson<number | false>('Chatter:DeleteGroup', channel, channel),
	chatterUpdateGroup: (channel: number, data: { label: string; icon?: string | null }) => sendJson<boolean>('Chatter:UpdateGroup', { channel, data }, true),
	chatterInviteSend: (channel: number, sid: number) => sendJson<boolean>('Chatter:Invite:Send', { channel, sid }, true),
	chatterInviteAccept: (channel: number) => sendJson<ChatterGroup | false>('Chatter:Invite:Accept', channel, false),
	chatterInviteDecline: (channel: number) => sendJson<boolean>('Chatter:Invite:Decline', channel, true),

	// blueline (PD trials/races) - restricted to on-duty police, CreateRacePD/StartRacePD can return
	// { failed: true, message } instead of a plain boolean, unlike every other app's callbacks
	bluelineCreateRace: (data: {
		name: string;
		host: string;
		track: number | null;
		buyin: string;
		laps: number;
		dnf_start: string;
		dnf_time: string;
		countdown: string;
		phasing: boolean;
		class: string;
	}) =>
		sendJson<PDRace | { failed: true; message: string } | false>('CreateRacePD', data, {
			id: Date.now(),
			class: data.class,
			name: data.name,
			state: 0,
			racers: { [data.host]: { source: 5, sid: 1 } },
			track: data.track ?? 1,
			laps: data.laps,
			host: data.host,
			host_id: 1,
			buyin: Number(data.buyin) || 0,
		}),
	bluelineCancelRace: (id: number | string) => sendJson<boolean>('CancelRacePD', id, true),
	bluelineJoinRace: (id: number | string) => sendJson<PDRace | false>('JoinRacePD', id, MOCK_PD_RACES[String(id)] ?? false),
	bluelineLeaveRace: (id: number | string) => sendJson<boolean>('LeaveRacePD', id, true),
	bluelineStartRace: (id: number | string) => sendJson<true | { failed: true; message: string } | false>('StartRacePD', id, true),
	bluelineEndRace: (id: number | string) => sendJson<boolean>('EndRacePD', id, true),
	bluelineCreateTrack: () => sendJson<boolean>('CreateTrackPD', {}, true),
	bluelineStopCreator: () => send('StopCreatorPD'),
	bluelineFinishCreator: (name: string, type: string) => sendJson<boolean>('FinishCreatorPD', { name, type }, true),
	bluelineDeleteTrack: (id: number) => sendJson<boolean>('DeleteTrackPD', id, true),
	bluelineResetTrackHistory: (id: number) => sendJson<boolean>('ResetTrackHistoryPD', id, true),

	// comanager (BizWiz) - Rename/Disband/Transfer aren't wired: Disband's server callback always errors
	// and Transfer has none, so there's no reachable path to exercise those three
	comanagerFetchRoster: (reqUpdate: boolean) =>
		sendJson<{ rosterData: Record<string, RosterEmployee[]> | false; jobData?: JobData[] }>('FetchRoster', { ReqUpdate: reqUpdate }, { rosterData: MOCK_ROSTER }),
	comanagerFetchTimeWorked: (jobId: string) => sendJson<TimeWorkedEntry[] | false>('FetchTimeWorked', jobId, MOCK_TIME_WORKED),
	comanagerQuitJob: (jobId: string) => sendJson<boolean>('QuitJob', { JobId: jobId }, true),
	comanagerHireEmployee: (data: { SID: number | string; Job: { Id: string; Workplace: JobWorkplace | null; Grade: { Id: string } } }) =>
		sendJson<ComanagerActionResult>('HireEmployee', data, { success: true }),
	comanagerFireEmployee: (data: { SID: number; Job: { Id: string } }) => sendJson<ComanagerActionResult>('FireEmployee', data, { success: true }),
	comanagerUpdateEmployee: (data: { SID: number; Job: { Id: string; Workplace: JobWorkplace | null; Grade: { Id: string } } }) =>
		sendJson<ComanagerActionResult>('UpdateEmployee', data, { success: true }),
	comanagerEditWorkplace: (jobId: string, workplaceId: string, newName: string) =>
		sendJson<ComanagerActionResult>('EditWorkplace', { JobId: jobId, WorkplaceId: workplaceId, NewName: newName }, { success: true }),
	comanagerCreateGrade: (data: { JobId: string; WorkplaceId: string | null; Name: string; Level: number; Permissions: Record<string, boolean> }) =>
		sendJson<ComanagerActionResult>('CreateGrade', data, { success: true }),
	comanagerEditGrade: (data: { JobId: string; WorkplaceId: string | null; Id: string; Name: string; Level: number; Permissions: Record<string, boolean> }) =>
		sendJson<ComanagerActionResult>('EditGrade', data, { success: true }),
	comanagerDeleteGrade: (data: { JobId: string; WorkplaceId: string | null; Id: string }) => sendJson<ComanagerActionResult>('DeleteGrade', data, { success: true }),

	// homemanage (Properties/DigiKeys) - Home:HighlightFurniture and Home:StartPlacement are always
	// dead server-side (`cb(false)` unconditionally in client/apps/homemanage.lua), ported faithfully
	// rather than "fixed" since that's the real shipped contract
	homeGetMyProperties: () =>
		sendJson<{ properties: HomeProperty[]; upgrades: Record<string, PropertyUpgradesForType> } | false>('Home:GetMyProperties', {}, {
			properties: MOCK_HOME_PROPERTIES,
			upgrades: MOCK_HOME_UPGRADES,
		}),
	homeLockProperty: (id: string | number) => sendJson<boolean>('Home:LockProperty', { id }, true),
	homeCreateDigiKey: (data: { updating?: boolean; id: string | number; target: number; permissions: Record<string, boolean> }) =>
		sendJson<HomeActionResult>('Home:CreateDigiKey', data, { error: false, code: 1 }),
	homeRevokeDigiKey: (id: string | number, target: string) => sendJson<HomeActionResult>('Home:RevokeDigiKey', { id, target }, { error: false, code: 1 }),
	homeRemoveMyKey: (id: string | number) => sendJson<HomeActionResult>('Home:RemoveMyKey', { id }, { error: false, code: 1 }),
	homeGetCurrentFurniture: (property: HomeProperty) => sendJson<CurrentFurnitureResult>('Home:GetCurrentFurniture', { property }, MOCK_FURNITURE),
	homeEditMode: () => send('Home:EditMode'),
	homePlaceFurniture: (category: string, model: string) => sendJson<boolean>('Home:PlaceFurniture', { category, model }, true),
	homeEditFurniture: (id: number | string) => sendJson<boolean>('Home:EditFurniture', { id }, true),
	homeDeleteFurniture: (id: number | string) => sendJson<FurnitureItem[] | false>('Home:DeleteFurniture', { id }, MOCK_FURNITURE.furniture ?? []),
	homeHighlightFurniture: (id: number | string) => sendJson<boolean>('Home:HighlightFurniture', { id }, false),
	homePurchaseInterior: (int: number | string, id: string | number) => sendJson<boolean>('PurchasePropertyInterior', { int, id }, true),
	homePurchaseUpgrade: (upgrade: string, id: string | number) => sendJson<boolean>('PurchasePropertyUpgrade', { upgrade, id }, true),
	homePreviewInterior: (int: number | string) => send('PreviewPropertyInterior', { int }),

	// redline (street racing) - restricted behind the RACE_DONGLE state, same PD-race-style contract as
	// blueline plus buy-ins/access/phasing/invites. AcceptInvite/DeclineInvite send the raw invite id,
	// not {id: ...}
	redlineCreateRace: (data: {
		name: string;
		host?: string;
		track: number | null;
		buyin: string;
		laps: number;
		dnf_start: string;
		dnf_time: string;
		countdown: string;
		class: string;
		access: string;
		phasing: string;
		phasingAdv: number;
	}) =>
		sendJson<RedlineRace | { failed: true; message: string } | false>('CreateRace', data, {
			id: Date.now(),
			class: data.class,
			name: data.name,
			state: 0,
			racers: data.host ? { [data.host]: { source: 5, sid: 1 } } : {},
			track: data.track ?? 1,
			laps: data.laps,
			host: data.host ?? '',
			host_id: 1,
			buyin: Number(data.buyin) || 0,
			access: data.access,
			phasing: data.phasing,
		}),
	redlineCancelRace: (id: number | string) => sendJson<boolean>('CancelRace', id, true),
	redlineJoinRace: (id: number | string) => sendJson<RedlineRace | false>('JoinRace', id, MOCK_REDLINE_RACES[String(id)] ?? false),
	redlineLeaveRace: (id: number | string) => sendJson<boolean>('LeaveRace', id, true),
	redlineStartRace: (id: number | string) => sendJson<true | { failed: true; message: string } | false>('StartRace', id, true),
	redlineEndRace: (id: number | string) => sendJson<boolean>('EndRace', id, true),
	redlineRemoveFromRace: (id: number | string, alias: string) => sendJson<boolean>('RemoveFromRace', { id, alias }, true),
	redlineSendInvite: (id: number | string, alias: string) => sendJson<boolean>('SendInvite', { id, alias }, true),
	redlineAcceptInvite: (id: number | string) => sendJson<boolean>('AcceptInvite', id, true),
	redlineDeclineInvite: (id: number | string) => sendJson<boolean>('DeclineInvite', id, true),
	redlineCreateTrack: () => sendJson<boolean>('CreateTrack', {}, true),
	redlineStopCreator: () => send('StopCreator'),
	redlineFinishCreator: (name: string, type: string) => sendJson<boolean>('FinishCreator', { name, type }, true),
	redlineDeleteTrack: (id: number) => sendJson<boolean>('DeleteTrack', id, true),
	redlineResetTrackHistory: (id: number) => sendJson<boolean>('ResetTrackHistory', id, true),

	// email
	readEmail: (id: number) => send('ReadEmail', id),
	deleteEmail: (id: number) => sendJson('DeleteEmail', id, true),
	gpsRoute: (location: { x: number; y: number; z: number }) => send('GPSRoute', { location }),
	hyperlink: (hyperlink: { event: string; data: unknown }, id: number) => send('Hyperlink', { hyperlink, id }),
};
