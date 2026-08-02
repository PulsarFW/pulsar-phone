export interface PhoneSettings {
	wallpaper: string;
	ringtone: string;
	texttone: string;
	colors: { accent: string };
	zoom: number;
	volume: number;
	notifications: boolean;
	appNotifications: Record<string, boolean>;
	Expanded?: boolean;
}

export interface PhoneAppsData {
	installed: string[];
	home: string[];
	dock: string[];
}

export interface AppProfile {
	sid: number;
	app: string;
	name: string;
	picture?: string | null;
	meta?: Record<string, unknown>;
}

// the "player" data-bus type is the player's whole Character:GetData() blob - only the fields
// Phase 0 screens read are typed, everything else still comes through on the object at runtime
export interface PhoneCharacterData {
	SID: number;
	Source?: number;
	First: string;
	Last: string;
	Phone: string;
	PhoneSettings: PhoneSettings;
	PhoneCase?: string;
	PhonePosition?: { x: number; y: number };
	Apps: PhoneAppsData;
	Alias?: Record<string, { name?: string } | undefined>;
	Profiles?: Record<string, AppProfile>;
	Crypto?: Record<string, number>;
	CryptoWallet?: string;
	States?: string[];
	TempJob?: string | false;
	Callsign?: string;
	Jobs?: PlayerJobEntry[];
	ID?: string;
	PhonePermissions?: Record<string, Record<string, boolean>>;
	[key: string]: unknown;
}

export interface CryptoCoin {
	Name: string;
	Short: string;
	Price: number;
	Buyable: boolean;
	Sellable: number | false;
}

export interface Contact {
	id: number;
	sid: number;
	number: string;
	name: string;
	avatar?: string | null;
	color?: string | null;
	favorite: boolean;
}

// state: 0 dialing/pending, 1 incoming (ringing), 2 active. method: 0 incoming, 1 outgoing
export interface CallState {
	id: number;
	state: 0 | 1 | 2;
	number: string;
	duration: number;
	method: 0 | 1;
	limited?: boolean;
	// client-side clock, set locally when the call goes active so the header can show a live timer
	startedAt?: number;
}

export interface CallRecord {
	id: number;
	number: string;
	duration: number;
	method: 0 | 1;
	time?: number;
}

export interface MessageThread {
	id: number;
	owner: string;
	number: string;
	method: number;
	time: number;
	count: number;
	message: string;
	unread: number;
}

export interface MessageText {
	id: number;
	owner: string;
	number: string;
	method: number;
	unread: boolean | number;
	time: number;
	message: string;
}

export interface NewMessagePush {
	id: number;
	owner: string;
	number: string;
	message: string;
	time: number;
	contact?: Contact | false;
}

export interface EmailMessage {
	id: number;
	sid: number;
	sender: string;
	subject: string;
	body: string;
	time: number;
	unread: boolean;
	flags?: Record<string, unknown>;
	expires?: number | null;
}

export interface ChopVehicleRequest {
	name: string;
	hv?: boolean;
}

export interface ChopList {
	id?: number;
	public?: boolean;
	list: ChopVehicleRequest[];
}

export interface ChopperRank {
	label: string;
	value: number;
}

export interface ChopperReputation {
	id: number;
	label: string;
	value: number;
	current?: ChopperRank;
	next?: ChopperRank;
}

export interface ChopperDetails {
	banned: boolean;
	chopList: Record<string, ChopList>;
	reputations: ChopperReputation[];
}

export interface Dyn8Property {
	_id: number;
	label: string;
	sold: boolean;
	price?: number;
	owner?: { First: string; Last: string; SID: number };
}

export interface CreditCheckResult {
	First: string;
	Last: string;
	Score: number;
	Amount: number;
}

export interface GarageVehicle {
	VIN: string;
	Make: string;
	Model: string;
	RegisteredPlate: string;
	Spawned?: boolean;
	Mileage?: number;
	Damage?: { Body?: number; Engine?: number };
	DamagedParts?: Record<string, number>;
	Storage: {
		Type: 0 | 1 | 2;
		Id?: string | number;
		Fine?: number;
		TimeHold?: { ImpoundedAt: number; ExpiresAt: number; Length: number };
	};
	PropertyStorage?: { label: string };
}

export interface GarageInfo {
	label: string;
}

export interface LoanData {
	_id: string;
	Type: 'vehicle' | 'property' | string;
	AssetIdentifier: string;
	Total: number;
	DownPayment: number;
	Paid: number;
	Remaining: number;
	InterestRate: number;
	TotalPayments: number;
	PaidPayments: number;
	NextPayment: number;
	MissedPayments: number;
	MissablePayments: number;
	Defaulted: boolean;
	Creation: number;
}

export interface BankLoansData {
	creditScore: number;
	loans: LoanData[];
}

export interface LoanPaymentResult {
	success: boolean;
	paidOff?: boolean;
	paymentAmount?: number;
	message?: string;
}

export interface PhoneDocument {
	id: number;
	sid: number;
	title: string;
	content: string;
	time: number;
	signature_required?: boolean;
	signed?: number | false;
	signed_name?: string;
}

export interface DocumentSigner {
	sid: number;
	signed_name: string;
	signed?: number | false;
}

export interface Tweet {
	id: number;
	author: { name: string; picture?: string | null };
	content: string;
	time: number;
	image: { using: boolean; link: string | null };
	verified?: false | 'business' | 'government';
	retweet?: number;
	cid?: number;
}

export interface BankAccountPermissions {
	BALANCE?: boolean;
	TRANSACTIONS?: boolean;
	WITHDRAW?: boolean;
	BILL?: boolean;
}

export interface BankAccount {
	Account: string;
	Type: 'personal' | 'personal_savings' | 'organization' | string;
	Name?: string;
	Balance: number;
	Permissions?: BankAccountPermissions;
}

export interface PendingBill {
	Id: number;
	Name: string;
	Amount: number;
	Description?: string;
	Timestamp: number;
}

export interface BankAccountsData {
	accounts: BankAccount[];
	pendingBills: PendingBill[];
}

export interface BankTransaction {
	Title?: string;
	Amount: number;
	Timestamp: number;
}

export interface Advert {
	id: number;
	author: string;
	number: string;
	title: string;
	price?: string | number;
	full: string;
	categories: string[];
	time: number;
}

export interface LaborJob {
	Id: string;
	Name: string;
	Salary: number;
	Limit: number | false;
	OnDuty: unknown[];
	Restricted?: { state?: string };
}

export interface WorkgroupMember {
	SID: number;
	First: string;
	Last: string;
}

export interface Workgroup {
	Creator: WorkgroupMember;
	Members: WorkgroupMember[];
	Working: boolean;
}

export interface LaborRank {
	label: string;
	value: number;
}

export interface LaborReputation {
	id: string;
	label: string;
	value: number;
	current?: LaborRank;
	next?: LaborRank;
}

export interface LaborDetails {
	jobs: Record<string, LaborJob>;
	groups: Workgroup[];
	reputations: LaborReputation[];
}

export interface ChatterGroup {
	id: number;
	label: string;
	icon?: string | null;
	owner: number;
	joined_date?: number;
	last_message?: number | null;
}

export interface ChatterInvite {
	sender: number;
	group: number;
	label: string;
	icon?: string | null;
	timestamp: number;
}

export interface ChatterMessage {
	id: number;
	message: string;
	timestamp: number;
	author: number;
	group?: number;
}

export interface PDCheckpoint {
	coords: { x: number; y: number; z: number };
	isStart?: boolean;
	size?: number;
}

export interface PDTrackFastestLap {
	alias: string;
	lap_start: number;
	lap_end: number;
	car?: string;
	owned?: boolean;
}

export interface PDTrack {
	id: number;
	Name: string;
	Distance: string;
	Type: 'laps' | 'p2p' | string;
	Checkpoints: PDCheckpoint[];
	Fastest?: PDTrackFastestLap[];
}

export interface PDRacer {
	source?: number;
	sid?: number;
	place?: number | false;
	isOwned?: boolean;
	car?: string;
	finished?: boolean | number;
	fastest?: { lap_start: number; lap_end: number } | null;
}

// state: -1 cancelled, 0 setting up (joinable), 1 in progress, 2 finished
export interface PDRace {
	id: number | string;
	class: string;
	name: string;
	state: -1 | 0 | 1 | 2;
	racers: Record<string, PDRacer>;
	track: number;
	laps: number;
	host: string;
	host_src?: number;
	host_id: number;
	buyin?: number;
	access?: string;
	time?: number;
	countdown?: string | number;
	dnf_start?: string | number;
	dnf_time?: string | number;
	phasing?: boolean;
}

// comanager (BizWiz) - Jobs/JobData come from a shared core "plsr.Jobs" module outside this resource
export interface JobGrade {
	Id: string;
	Name: string;
	Level: number;
	Permissions: Record<string, boolean>;
	Owner?: boolean;
}

export interface JobWorkplace {
	Id: string;
	Name: string;
	Grades: JobGrade[];
}

// present on state.data.data.JobData - the full definition of every job the player holds
export interface JobData {
	Id: string;
	Name: string;
	Owner?: number;
	Grades?: JobGrade[];
	Workplaces?: JobWorkplace[];
}

// present on player.Jobs - the player's own membership record for one job
export interface PlayerJobEntry {
	Id: string;
	Name: string;
	Grade: JobGrade;
	Workplace?: JobWorkplace | null;
}

export interface RosterEmployee {
	SID: number;
	First: string;
	Last: string;
	Phone: string;
	JobData: PlayerJobEntry;
}

export interface JobPermissionDef {
	name: string;
	restricted?: string[] | false;
}

export interface TimeWorkedEntry {
	SID: number;
	First: string;
	Last: string;
	LastClockOn?: Record<string, number>;
	TimeClockedOn?: Record<string, { time: number; minutes: number }[]>;
}

export interface ComanagerActionResult {
	success: boolean;
	code?: string;
}

// homemanage (Properties/DigiKeys) - property.keys is keyed by character ID (not SID) per
// server/apps/homemanage.lua's `property.keys[char:GetData("ID")]` checks
export interface PropertyKeyEntry {
	Char: string;
	SID: number;
	First: string;
	Last: string;
	Owner: boolean;
	Permissions?: Record<string, boolean>;
}

export interface PropertyLocation {
	x: number;
	y: number;
	z: number;
	h?: number;
}

export interface HomeProperty {
	id: string | number;
	type: string;
	label: string;
	sold?: boolean;
	price?: number;
	interior?: number;
	locked?: boolean;
	location?: Record<string, PropertyLocation>;
	owner?: string;
	keys: Record<string, PropertyKeyEntry>;
	upgrades?: Record<string, string | number>;
}

export interface PropertyUpgradeLevel {
	name: string;
	info?: string;
	price?: number;
}

export interface PropertyInteriorLevel {
	id: string | number;
	name: string;
	price: number;
	info?: { description?: string };
}

export interface PropertyUpgradeDef {
	levels: PropertyUpgradeLevel[];
}

export interface PropertyInteriorDef {
	levels: PropertyInteriorLevel[];
}

// keyed per upgrade type ("interior" is always the special one), one of these per property "type"
export interface PropertyUpgradesForType {
	interior: PropertyInteriorDef;
	[upgradeType: string]: PropertyUpgradeDef | PropertyInteriorDef;
}

export interface FurnitureItem {
	id: number | string;
	name: string;
	model: string;
	cat: string;
	dist: number;
}

export interface FurnitureCatalogEntry {
	id: number;
	name: string;
	model: string;
	cat: string;
}

export interface FurnitureCategory {
	name: string;
}

export interface CurrentFurnitureResult {
	success: boolean;
	furniture?: FurnitureItem[];
	catalog?: Record<string, FurnitureCatalogEntry>;
	categories?: Record<string, FurnitureCategory>;
	err?: string;
}

export interface HomeActionResult {
	error: boolean;
	code: number;
}

// redline (street racing) - reuses blueline's PDTrack/PDCheckpoint shape (same track structure, separate
// top-level list pushed under the "tracks" data key instead of "tracks_pd")
export interface RedlineRacer {
	source?: number;
	sid?: number;
	place?: number | false;
	isOwned?: boolean;
	car?: string;
	finished?: boolean | number;
	fastest?: { lap_start: number; lap_end: number } | null;
	reward?: { cash?: number; coin?: string; crypto?: number };
}

// state: -1 cancelled, 0 setting up (joinable), 1 in progress, 2 finished
export interface RedlineRace {
	id: number | string;
	class: string;
	name: string;
	state: -1 | 0 | 1 | 2;
	racers: Record<string, RedlineRacer>;
	track: number;
	laps: number;
	host: string;
	host_src?: number;
	host_id: number;
	buyin?: number;
	access?: 'public' | 'team' | 'invite' | string;
	time?: number;
	countdown?: string | number;
	dnf_start?: string | number;
	dnf_time?: string | number;
	phasing?: string;
	phasingAdv?: number | string;
}

export interface RedlineInvite {
	id: string | number;
	sender: string;
	event: string;
	expires: number;
}

export interface ServiceEntry {
	jobName: string;
	jobLabel: string;
	jobIcon?: string;
	jobColor: string;
	jobTextColor: string;
	jobLocation?: { x: number; y: number; z: number };
	phoneNumber?: string;
	players: { playerId: number; playerNumber: string; playerName: string; playerStatus: number }[];
}

export interface MediaItem {
	id: number;
	sid: number;
	image_url: string;
	time?: number;
}

export interface NotificationAppTag {
	color: string;
	label: string;
	icon: string;
}

export interface PhoneNotification {
	id?: string | number;
	title: string;
	description?: string;
	time: number;
	duration: number;
	app: string | NotificationAppTag;
	action?: Record<string, unknown>;
	data?: unknown;
	show: boolean;
}

// SET_DATA/ADD_DATA/UPDATE_DATA/REMOVE_DATA/RESET_DATA all key off this "type" string -
// "player", "contacts", "calls", "emails", "myDocuments", "onDuty", etc. see server/apps/*.lua
export interface DataSetPayload {
	type: string;
	data: unknown;
}

export interface DataAddPayload {
	type: string;
	data: unknown;
	key?: string | number;
}

export interface DataUpdatePayload {
	type: string;
	id: string | number;
	data: unknown;
}

export interface DataRemovePayload {
	type: string;
	id: string | number;
}
