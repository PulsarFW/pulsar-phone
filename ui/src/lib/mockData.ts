// devValue fixtures for nui.ts's sendJson calls - dev-server-only, also the fallback if a real fetch throws

import type {
	Advert,
	BankAccountsData,
	BankLoansData,
	BankTransaction,
	ChatterGroup,
	ChatterInvite,
	ChatterMessage,
	ChopperDetails,
	Contact,
	CryptoCoin,
	Dyn8Property,
	EmailMessage,
	GarageVehicle,
	LaborDetails,
	CurrentFurnitureResult,
	HomeProperty,
	JobData,
	JobPermissionDef,
	MediaItem,
	MessageText,
	MessageThread,
	PDRace,
	PDTrack,
	PhoneCharacterData,
	PropertyUpgradesForType,
	RedlineInvite,
	RedlineRace,
	RosterEmployee,
	TimeWorkedEntry,
	PhoneDocument,
	ServiceEntry,
	Tweet,
} from './types';
import type { PhoneApp } from '../config';

export const MOCK_PLAYER: PhoneCharacterData = {
	SID: 1,
	Source: 5,
	ID: 'char1',
	First: 'John',
	Last: 'Doe',
	Phone: '555-0100',
	PhoneSettings: {
		wallpaper: 'wallpaper',
		ringtone: 'ringtone1.ogg',
		texttone: 'text1.ogg',
		colors: { accent: '#7c1ac1' },
		zoom: 75,
		volume: 100,
		notifications: true,
		appNotifications: {},
	},
	PhoneCase: 'default',
	PhonePosition: { x: 1000, y: 250 },
	Apps: {
		installed: ['phone', 'messages', 'contacts', 'store', 'settings', 'email', 'bank'],
		home: ['phone', 'messages', 'contacts', 'store', 'settings', 'email', 'bank'],
		dock: ['contacts', 'phone', 'messages'],
	},
	Alias: {},
	Profiles: {
		email: { sid: 1, app: 'email', name: 'john_doe1@pulsarfw.com' },
		twitter: { sid: 1, app: 'twitter', name: 'john_doe1', picture: null },
		redline: { sid: 1, app: 'redline', name: 'MeFast', picture: null },
	},
	Crypto: { MALD: 12 },
	CryptoWallet: '0x8f3a2b91',
	States: ['PHONE_VPN', 'RACE_DONGLE'],
	TempJob: false,
	Callsign: '1-A-12',
	PhonePermissions: { redline: { create: true } },
	Jobs: [
		{
			Id: 'autoexotics',
			Name: 'Auto Exotics',
			Grade: { Id: 'owner', Name: 'Owner', Level: 99, Permissions: {}, Owner: true },
			Workplace: null,
		},
	],
};

// server/component.lua's "JobPermissions" push shape: { [job]: { [permissionKey]: boolean } }
export const MOCK_JOB_PERMISSIONS: Record<string, Record<string, boolean>> = {
	police: { PD_MANAGE_TRIALS: true },
};

export const MOCK_CRYPTO_COINS: CryptoCoin[] = [
	{ Name: 'Vroom', Short: 'VRM', Price: 100, Buyable: false, Sellable: false },
	{ Name: 'Mald', Short: 'MALD', Price: 250, Buyable: true, Sellable: 190 },
];

export const MOCK_CONTACTS: Contact[] = [
	{ id: 1, sid: 2, number: '555-0101', name: 'Jane Smith', color: '#21a500', favorite: true },
	{ id: 2, sid: 3, number: '555-0102', name: 'Bob Marley', color: '#ff6a00', favorite: false },
];

export const MOCK_MEDIA: MediaItem[] = Array.from({ length: 6 }, (_, i) => ({
	id: i + 1,
	sid: 1,
	image_url: `../images/wallpapers/${i + 1}.webp`,
	time: Math.floor(Date.now() / 1000) - i * 3600,
}));

export const MOCK_SERVICES: ServiceEntry[] = [
	{
		jobName: 'ems',
		jobLabel: 'EMS',
		jobIcon: 'star-of-life',
		jobColor: '#ce2029',
		jobTextColor: '#fff',
		jobLocation: { x: 1151.694, y: -1527.149, z: 34.844 },
		phoneNumber: '555-0911',
		players: [
			{ playerId: 1, playerNumber: '555-0201', playerName: 'Sam Fisher', playerStatus: 1 },
			{ playerId: 2, playerNumber: '555-0202', playerName: 'Alex Chen', playerStatus: 0 },
		],
	},
	{
		jobName: 'bennys',
		jobLabel: "Benny's",
		jobIcon: 'gear',
		jobColor: '#de4cee',
		jobTextColor: '#fff',
		jobLocation: { x: -211.506, y: -1326.756, z: 31.294 },
		players: [{ playerId: 3, playerNumber: '555-0203', playerName: 'Benny Ortiz', playerStatus: 1 }],
	},
];

export const MOCK_CHOPPER: ChopperDetails = {
	banned: false,
	chopList: {
		LSU: { public: true, list: [{ name: 'Sultan RS', hv: true }, { name: 'Blista', hv: false }] },
		Personal: { id: 1, list: [{ name: 'Elegy Retro Custom', hv: true }] },
	},
	reputations: [
		{ id: 1, label: 'Chopping', value: 620, current: { label: 'Novice', value: 500 }, next: { label: 'Trusted', value: 1000 } },
	],
};

export const MOCK_PROPERTIES: Dyn8Property[] = [
	{ _id: 155, label: '1 Grove St', sold: false, price: 125000 },
	{ _id: 156, label: '2 Grove St', sold: true, owner: { First: 'Test', Last: 'McTesty', SID: 2 } },
];

export const MOCK_VEHICLES: GarageVehicle[] = [
	{
		VIN: '9KSPCGRAP7A385723',
		Make: 'Chevrolet',
		Model: 'Corvette',
		RegisteredPlate: 'E6GMK36S',
		Spawned: true,
		Mileage: 301.59,
		Damage: { Body: 1000, Engine: 1000 },
		DamagedParts: { Brakes: 95.379, Axle: 99.562, Clutch: 96.534 },
		Storage: { Type: 1, Id: 'sa_ave_downtown' },
	},
	{
		VIN: '9KSPCGRAP7A385732',
		Make: 'Karin',
		Model: 'Sultan RS',
		RegisteredPlate: 'RS4LYFE',
		Spawned: false,
		Mileage: 322.6,
		Damage: { Body: 991, Engine: 1000 },
		DamagedParts: { Radiator: 87.411, Electronics: 94.405 },
		Storage: { Type: 0, Fine: 3, TimeHold: { ImpoundedAt: 1625774487, ExpiresAt: Math.floor(Date.now() / 1000) + 3600, Length: 43200 } },
	},
];

export const MOCK_GARAGES: Record<string, { label: string }> = {
	impound: { label: 'Impound Lot' },
	sa_ave_downtown: { label: 'Downtown Garage' },
};

export const MOCK_BANK_ACCOUNTS: BankAccountsData = {
	accounts: [
		{ Account: '1000200030', Type: 'personal', Balance: 45820, Permissions: { BALANCE: true, TRANSACTIONS: true, WITHDRAW: true, BILL: true } },
		{ Account: '1000200031', Type: 'personal_savings', Balance: 12000, Permissions: { BALANCE: true, TRANSACTIONS: true, WITHDRAW: true, BILL: false } },
	],
	pendingBills: [{ Id: 1, Name: 'Auto Insurance', Amount: 350, Description: 'Monthly premium', Timestamp: Math.floor(Date.now() / 1000) - 7200 }],
};

export const MOCK_TRANSACTIONS: BankTransaction[] = [
	{ Title: 'Direct Deposit', Amount: 2500, Timestamp: Date.now() - 3600_000 },
	{ Title: 'Grocery Store', Amount: -120.5, Timestamp: Date.now() - 86400_000 },
];

export const MOCK_LABOR: LaborDetails = {
	jobs: {
		Mining: { Id: 'Mining', Name: 'Mining', Salary: 800, Limit: 10, OnDuty: [] },
		Salvaging: { Id: 'Salvaging', Name: 'Salvaging', Salary: 750, Limit: 10, OnDuty: [] },
		Chopping: { Id: 'Chopping', Name: 'Chopping', Salary: 900, Limit: false, OnDuty: [], Restricted: { state: 'ACCESS_LSUNDERGROUND' } },
	},
	groups: [
		{
			Creator: { SID: 2, First: 'Test', Last: 'McTesty' },
			Members: [
				{ SID: 3, First: 'Sam', Last: 'Fisher' },
				{ SID: 4, First: 'Alex', Last: 'Chen' },
			],
			Working: false,
		},
	],
	reputations: [
		{ id: 'mining', label: 'Mining', value: 250, current: { label: 'Novice', value: 0 }, next: { label: 'Rank 1', value: 500 } },
		{ id: 'salvaging', label: 'Salvaging', value: 500, current: { label: 'Rank 1', value: 500 }, next: { label: 'Rank 2', value: 1000 } },
	],
};

export const MOCK_ADVERTS: Record<string, Advert> = {
	'12': {
		id: 12,
		author: 'Jane Smith',
		number: '555-0101',
		title: 'Selling a barely-used Sultan RS',
		price: '45000',
		full: 'Low mileage, garage kept, no accidents. https://i.imgur.com/example.jpg',
		categories: ['Want-To-Sell'],
		time: Date.now() - 3600_000,
	},
	'18': {
		id: 18,
		author: 'Bob Marley',
		number: '555-0102',
		title: 'Looking for a mechanic - flat tire emergency',
		full: 'Stuck downtown, need someone ASAP.',
		categories: ['Services', 'Help Wanted'],
		time: Date.now() - 7200_000,
	},
};

export const MOCK_TWEETS: Tweet[] = [
	{
		id: 1,
		author: { name: 'JaneSmith22', picture: null },
		content: '@JohnDoe1 just saw a bike get repo\'d at the pier lol #LosSantos',
		time: Math.floor(Date.now() / 1000) - 1800,
		image: { using: false, link: null },
	},
	{
		id: 2,
		author: { name: 'CityWatch', picture: null },
		content: 'Traffic backed up on the freeway again. Take the coast road if you can. https://i.imgur.com/example.jpg',
		time: Math.floor(Date.now() / 1000) - 5400,
		image: { using: false, link: null },
		verified: 'government',
	},
];

export const MOCK_DOCUMENTS: PhoneDocument[] = [
	{ id: 1, sid: 1, title: 'Vehicle Bill of Sale', content: 'This document confirms transfer of ownership of the vehicle described below...', time: Math.floor(Date.now() / 1000) - 3600 },
	{
		id: 2,
		sid: 1,
		title: 'Lease Agreement',
		content: 'Lease agreement between landlord and tenant for the property located at...',
		time: Math.floor(Date.now() / 1000) - 86400,
		signature_required: true,
		signed: false,
	},
];

export const MOCK_LOANS: BankLoansData = {
	creditScore: 720,
	loans: [
		{
			_id: 'loan-1',
			Type: 'vehicle',
			AssetIdentifier: '9KSPCGRAP7A385723',
			Total: 40000,
			DownPayment: 8000,
			Paid: 12000,
			Remaining: 20000,
			InterestRate: 15,
			TotalPayments: 20,
			PaidPayments: 6,
			NextPayment: Math.floor(Date.now() / 1000) + 86400 * 3,
			MissedPayments: 0,
			MissablePayments: 3,
			Defaulted: false,
			Creation: Math.floor(Date.now() / 1000) - 86400 * 42,
		},
		{
			_id: 'loan-2',
			Type: 'property',
			AssetIdentifier: '1 Grove St',
			Total: 125000,
			DownPayment: 25000,
			Paid: 100000,
			Remaining: 0,
			InterestRate: 12,
			TotalPayments: 24,
			PaidPayments: 24,
			NextPayment: 0,
			MissedPayments: 0,
			MissablePayments: 3,
			Defaulted: false,
			Creation: Math.floor(Date.now() / 1000) - 86400 * 400,
		},
	],
};

export const MOCK_THREADS: MessageThread[] = [
	{ id: 5, owner: '555-0100', number: '555-0101', method: 0, time: Math.floor(Date.now() / 1000) - 300, count: 4, message: 'See you at 8', unread: 1 },
];

export const MOCK_TEXTS: MessageText[] = [
	{ id: 1, owner: '555-0100', number: '555-0101', method: 1, unread: false, time: Math.floor(Date.now() / 1000) - 600, message: 'You still up for tonight?' },
	{ id: 2, owner: '555-0100', number: '555-0101', method: 0, unread: false, time: Math.floor(Date.now() / 1000) - 300, message: 'See you at 8' },
];

// the full remaining catalog from server/data.lua's registry (everything except the 7 core apps and
// "comanager", which is auto-provisioned for business owners, not store-browsable) - pushed alongside
// CORE_APPS in dev so the Store app's "Store" tab has the whole catalog to preview, matching in-game
// behavior. Each of these now has its own real placeholder screen under lib/apps/<name>/ (see Shell.svelte)
// rather than bouncing to Home - install one from the Store tab to open it.
export const MOCK_STORE_APPS: PhoneApp[] = [
	{ name: 'loans', storeLabel: 'Loans', label: 'Loans', icon: ['far', 'money-check-dollar'], color: '#30a60f', params: '', canUninstall: true, store: true, unread: 0 },
	{ name: 'twitter', storeLabel: 'Spammer', label: 'Spammer', icon: ['far', 'hashtag'], color: '#c4b404', params: '', canUninstall: true, store: true, unread: 0 },
	{ name: 'chatter', storeLabel: 'Chatter', label: 'Chatter', icon: ['fab', 'comments'], color: '#2d2835', params: '', canUninstall: true, store: true, unread: 0 },
	{ name: 'adverts', storeLabel: 'Ads', label: 'Ads', icon: ['fab', 'bullhorn'], color: '#870b30', params: '', canUninstall: true, store: true, unread: 0 },
	{
		name: 'redline',
		storeLabel: 'Redline',
		label: 'Redline',
		icon: ['far', 'gauge-simple-high'],
		color: '#9d1614',
		params: '',
		canUninstall: true,
		store: true,
		unread: 0,
		restricted: { state: 'RACE_DONGLE' },
	},
	{
		name: 'blueline',
		storeLabel: 'Trials',
		label: 'Trials',
		icon: ['far', 'stopwatch'],
		color: '#1258a3',
		params: '',
		canUninstall: true,
		store: true,
		unread: 0,
		restricted: { job: { police: 1 } },
	},
	{ name: 'labor', storeLabel: 'Jobs', label: 'Jobs', icon: ['fad', 'hammer'], color: '#05737d', params: '', canUninstall: true, store: true, unread: 0 },
	{ name: 'crypto', storeLabel: 'DigiDollar', label: 'DigiDollar', icon: ['far', 'bitcoin-sign'], color: '#354f34', params: '', canUninstall: true, store: true, unread: 0 },
	{
		name: 'dyn8',
		storeLabel: 'Dynasty 8',
		label: 'Dynasty 8',
		icon: ['fad', 'sign-hanging'],
		color: '#136231',
		params: '',
		canUninstall: true,
		store: true,
		unread: 0,
		restricted: { job: { realestate: 1 } },
	},
	{ name: 'homemanage', storeLabel: 'Properties', label: 'Properties', icon: 'house-signal', color: '#362a4f', params: '', canUninstall: true, store: true, unread: 0 },
	{ name: 'garage', storeLabel: 'Garage', label: 'Garage', icon: 'warehouse', color: '#50ba13', params: '', canUninstall: true, store: true, unread: 0 },
	{ name: 'pingem', storeLabel: 'FINDR', label: 'FINDR', icon: 'map-pin', color: '#e3db02', params: '', canUninstall: true, store: true, unread: 0 },
	{ name: 'calculator', storeLabel: 'Calculator', label: 'Calculator', icon: 'calculator', color: '#E95200', params: '', canUninstall: true, store: true, unread: 0 },
	{ name: 'documents', storeLabel: 'Documents', label: 'Documents', icon: 'file-lines', color: '#820366', params: '', canUninstall: true, store: true, unread: 0 },
	{ name: 'services', storeLabel: 'Services', label: 'Services', icon: 'clipboard-list', color: '#E95200', params: '', canUninstall: true, store: true, unread: 0 },
	{
		name: 'chopper',
		storeLabel: 'Chopper',
		label: 'Chopper',
		icon: 'screwdriver-wrench',
		color: '#8800c7',
		params: '',
		canUninstall: true,
		store: true,
		unread: 0,
		restricted: { state: 'ACCESS_CHOPPER' },
	},
	{ name: 'media', storeLabel: 'Media', label: 'Media', icon: 'photo-film', color: '#59E5F7', params: '', canUninstall: true, store: true, unread: 0 },
	{ name: 'music', storeLabel: 'Music', label: 'Music', icon: 'music', color: '#63e6be', params: '', canUninstall: true, store: true, unread: 0 },
];

export const MOCK_EMAILS: EmailMessage[] = [
	{
		id: 1,
		sid: 1,
		sender: 'noreply@pulsarfw.com',
		subject: 'Welcome to Pulsar',
		body: 'Thanks for joining the city.',
		time: Math.floor(Date.now() / 1000) - 3600,
		unread: true,
	},
];

export const MOCK_CHATTER_GROUPS: ChatterGroup[] = [
	{ id: 1, label: 'Test Channel', icon: null, owner: 1, joined_date: Math.floor(Date.now() / 1000) - 86400, last_message: Math.floor(Date.now() / 1000) - 600 },
	{ id: 2, label: "pls be last lol", icon: null, owner: 2, joined_date: Math.floor(Date.now() / 1000) - 172800, last_message: null },
];

export const MOCK_CHATTER_INVITES: Record<string, ChatterInvite> = {
	3: { sender: 2, group: 3, label: 'Racing Crew', icon: null, timestamp: Math.floor(Date.now() / 1000) - 300 },
};

// server order: DESC by timestamp (newest first, matches Chatter:LoadMessages' real SQL ORDER BY)
export const MOCK_CHATTER_MESSAGES: ChatterMessage[] = [
	{ id: 3, message: 'need a hand with something later', timestamp: Math.floor(Date.now() / 1000) - 400, author: 2 },
	{ id: 2, message: 'yeah whats up', timestamp: Math.floor(Date.now() / 1000) - 460, author: 1 },
	{ id: 1, message: 'hey, you around?', timestamp: Math.floor(Date.now() / 1000) - 500, author: 2 },
];

export const MOCK_PD_TRACKS: PDTrack[] = [
	{
		id: 1,
		Name: 'Vinewood Loop',
		Distance: '3.2 Miles',
		Type: 'laps',
		Checkpoints: [
			{ coords: { x: 100, y: 200, z: 30 }, isStart: true, size: 10 },
			{ coords: { x: 300, y: 250, z: 30 }, size: 10 },
			{ coords: { x: 200, y: 400, z: 30 }, size: 10 },
		],
		Fastest: [{ alias: '1-A-12', lap_start: 0, lap_end: 62000, car: 'Sultan RS', owned: true }],
	},
	{
		id: 2,
		Name: 'Del Perro Sprint',
		Distance: '1.8 Miles',
		Type: 'p2p',
		Checkpoints: [
			{ coords: { x: -500, y: -800, z: 20 }, isStart: true, size: 10 },
			{ coords: { x: -900, y: -600, z: 20 }, size: 10 },
		],
	},
];

export const MOCK_JOB_DATA: JobData[] = [
	{
		Id: 'autoexotics',
		Name: 'Auto Exotics',
		Owner: 1,
		Grades: [
			{ Id: 'owner', Name: 'Owner', Level: 99, Permissions: { JOB_MANAGEMENT: true, JOB_HIRE: true, JOB_FIRE: true }, Owner: true },
			{ Id: 'manager', Name: 'Manager', Level: 50, Permissions: { JOB_HIRE: true, JOB_FIRE: true } },
			{ Id: 'employee', Name: 'Employee', Level: 1, Permissions: {} },
		],
	},
];

export const MOCK_ROSTER: Record<string, RosterEmployee[]> = {
	autoexotics: [
		{ SID: 1, First: 'John', Last: 'Doe', Phone: '555-0100', JobData: { Id: 'autoexotics', Name: 'Auto Exotics', Grade: MOCK_JOB_DATA[0].Grades![0], Workplace: null } },
		{ SID: 2, First: 'Jane', Last: 'Smith', Phone: '555-0101', JobData: { Id: 'autoexotics', Name: 'Auto Exotics', Grade: MOCK_JOB_DATA[0].Grades![2], Workplace: null } },
	],
};

export const MOCK_TIME_WORKED: TimeWorkedEntry[] = [
	{
		SID: 1,
		First: 'John',
		Last: 'Doe',
		LastClockOn: { autoexotics: Math.floor(Date.now() / 1000) - 3600 },
		TimeClockedOn: { autoexotics: [{ time: Math.floor(Date.now() / 1000) - 3600, minutes: 45 }] },
	},
	{ SID: 2, First: 'Jane', Last: 'Smith', LastClockOn: {}, TimeClockedOn: {} },
];

// mirrors server/apps/comanager.lua's `_jobPerms` table (trimmed to the entries a phone-side grade
// editor actually needs to show, the real table also has dealership/vehicle-fleet ones)
export const MOCK_NAMED_JOB_PERMISSIONS: Record<string, JobPermissionDef> = {
	JOB_MANAGEMENT: { name: 'Manage Company' },
	JOB_MANAGE_EMPLOYEES: { name: 'Manage/Promote Employees' },
	JOB_HIRE: { name: 'Hire Employees' },
	JOB_FIRE: { name: 'Fire Employees' },
	JOB_STORAGE: { name: 'Access Company Storage' },
	JOB_ACCESS_SAFE: { name: 'Access Safe' },
	JOB_CRAFTING: { name: 'Access Crafting' },
	JOB_SHOP: { name: 'Stock Business Shop' },
	JOB_SHOP_CONTROL: { name: 'Open/Close Business Shop' },
	BANK_ACCOUNT_BILL: { name: 'Bank Account - Send Bills' },
	BANK_ACCOUNT_MANAGE: { name: 'Bank Account - Manage' },
	BANK_ACCOUNT_WITHDRAW: { name: 'Bank Account - Withdraw' },
	BANK_ACCOUNT_DEPOSIT: { name: 'Bank Account - Deposit' },
	BANK_ACCOUNT_TRANSACTIONS: { name: 'Bank Account - View Transactions' },
	BANK_ACCOUNT_BALANCE: { name: 'Bank Account - View Balance' },
};

// server/apps/comanager.lua's `_blacklistedJobs` - jobs with their own dedicated apps (police/ems/gov),
// filtered out of BizWiz's job list since they're managed elsewhere
export const MOCK_EXTERNAL_JOBS: string[] = ['police', 'ems', 'government'];

export const MOCK_HOME_PROPERTIES: HomeProperty[] = [
	{
		id: 'prop1',
		type: 'house',
		label: '1 Grove St',
		sold: true,
		price: 100000,
		interior: 1,
		locked: false,
		owner: 'char1',
		keys: {
			char1: { Char: 'char1', SID: 1, First: 'John', Last: 'Doe', Owner: true },
			char2: { Char: 'char2', SID: 2, First: 'Jane', Last: 'Smith', Owner: false, Permissions: { upgrade: true } },
		},
		upgrades: { interior: 'house_apartment1' },
	},
];

export const MOCK_HOME_UPGRADES: Record<string, PropertyUpgradesForType> = {
	house: {
		interior: {
			levels: [
				{ id: 'house_apartment1', name: 'Apartment Style 1', price: 0, info: { description: 'Starter layout' } },
				{ id: 'house_apartment2', name: 'Apartment Style 2', price: 15000, info: { description: 'Modern layout' } },
			],
		},
		storage: { levels: [{ name: 'Storage I', info: '50 Slots', price: 5000 }, { name: 'Storage II', info: '100 Slots', price: 15000 }] },
	},
};

export const MOCK_FURNITURE: CurrentFurnitureResult = {
	success: true,
	furniture: [
		{ id: 1, name: 'Wooden Chair', model: 'v_res_tt_chair', cat: 'seating', dist: 2.4 },
		{ id: 2, name: 'Coffee Table', model: 'v_res_tt_table', cat: 'tables', dist: 4.1 },
	],
	catalog: {
		v_res_tt_chair: { id: 1, name: 'Wooden Chair', model: 'v_res_tt_chair', cat: 'seating' },
		v_res_tt_table: { id: 2, name: 'Coffee Table', model: 'v_res_tt_table', cat: 'tables' },
		v_res_tt_sofa: { id: 3, name: 'Sofa', model: 'v_res_tt_sofa', cat: 'seating' },
	},
	categories: { seating: { name: 'Seating' }, tables: { name: 'Tables' } },
};

export const MOCK_REDLINE_TRACKS: PDTrack[] = [
	{
		id: 1,
		Name: 'Vinewood Loop',
		Distance: '3.2 Miles',
		Type: 'laps',
		Checkpoints: [
			{ coords: { x: 100, y: 200, z: 30 }, isStart: true, size: 10 },
			{ coords: { x: 300, y: 250, z: 30 }, size: 10 },
			{ coords: { x: 200, y: 400, z: 30 }, size: 10 },
		],
		Fastest: [{ alias: 'MeFast', lap_start: 0, lap_end: 58000, car: 'Sultan RS' }],
	},
];

export const MOCK_REDLINE_RACES: Record<string, RedlineRace> = {
	1: {
		id: 1,
		class: 'All',
		name: 'Friday Night Meet',
		state: 0,
		racers: { MeFast: { source: 5, sid: 1 }, Full_send: { source: 6, sid: 2 } },
		track: 1,
		laps: 3,
		host: 'MeFast',
		host_id: 1,
		host_src: 5,
		buyin: 500,
		access: 'public',
		phasing: 'none',
		time: Math.floor(Date.now() / 1000) - 300,
	},
	2: {
		id: 2,
		class: 'All',
		name: 'Del Perro Dash',
		state: 2,
		racers: {
			MeFast: { place: 1, isOwned: true, car: 'Sultan RS', finished: true, fastest: { lap_start: 0, lap_end: 58000 }, reward: { cash: 1000, coin: 'VRM', crypto: 10 } },
			Full_send: { place: 2, isOwned: false, car: 'Elegy', finished: true, fastest: { lap_start: 0, lap_end: 63000 } },
		},
		track: 1,
		laps: 1,
		host: 'MeFast',
		host_id: 1,
		host_src: 5,
		buyin: 500,
		time: Math.floor(Date.now() / 1000) - 86400,
	},
};

export const MOCK_REDLINE_INVITES: RedlineInvite[] = [{ id: 1, sender: 'Full_send', event: 'Friday Night Meet', expires: Date.now() + 1000 * 60 * 5 }];

export const MOCK_PD_RACES: Record<string, PDRace> = {
	1: {
		id: 1,
		class: 'All',
		name: 'Friday Night Trials',
		state: 0,
		racers: { '1-A-12': { source: 5, sid: 1 }, '2-B-04': { source: 6, sid: 2 } },
		track: 1,
		laps: 3,
		host: '1-A-12',
		host_id: 1,
		host_src: 5,
		buyin: 0,
		time: Math.floor(Date.now() / 1000) - 300,
	},
	2: {
		id: 2,
		class: 'All',
		name: 'Del Perro Dash',
		state: 2,
		racers: {
			'1-A-12': { place: 1, isOwned: true, car: 'Sultan RS', finished: true, fastest: { lap_start: 0, lap_end: 61000 } },
			'2-B-04': { place: 2, isOwned: false, car: 'Elegy', finished: true, fastest: { lap_start: 0, lap_end: 68000 } },
		},
		track: 2,
		laps: 1,
		host: '1-A-12',
		host_id: 1,
		host_src: 5,
		buyin: 0,
		time: Math.floor(Date.now() / 1000) - 86400,
	},
};
