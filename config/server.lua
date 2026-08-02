return {
	NotificationDurations = {
		short = 6000,
		medium = 10000,
		long = 15000,
		ping = 15000,
	},

	NearbyShareRadius = 5.0,
	RaceStartDistance = 25,

	-- services.lua's own blacklist below is a different, larger list - not the same thing
	ProtectedJobs = { "police", "ems", "government" },

	Pagination = {
		messagesPerPage = 20,
		chatterPerPage = 25,
		tweetsPerPage = 20,
		callsOnSpawn = 100,
		emailsOnSpawn = 150,
		mediaMax = 10,
		dyn8SearchLimit = 80,
	},

	Phone = {
		defaultPosition = { x = 1000, y = 250 },
		resetPosition = { x = 25, y = 25 },
		homeAppLimit = 20,
		dockAppLimit = 4,
		businessCallRingTimeout = 30000,
		emailDomain = "pulsarfw.com",
	},

	Racing = {
		leaderboardSize = 10,
		reputationRankValues = { 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000 },

		awardedCoin = "VRM",
		awardedAmount = 5,
		cryptoPayout = 16,
		minRacersForCrypto = 5,
		payoutSplit = { first = 0.5, second = 0.25, thirdFourth = 0.125 },
		reputationBase = 25,
		reputationPerPlacement = 25,

		alertDuration = 60 * 5,
		inviteExpiry = 60 * 5,

		checkpointPhasingMin = 1,
		checkpointPhasingMax = 10,
		timedPhasingMin = 3,
		timedPhasingMax = 60,

		vendorRestockMinMinutes = { 30, 60 },
		vendorRestockMaxMinutes = { 240, 360 },
		vendorLocation = vector3(707.286, -967.542, 30.468),

		items = {
			{ item = "racing_crappy", coin = "MALD", price = 10, qty = 100, vpn = false },
			{ item = "racedongle", coin = "VRM", rep = "Racing", repLvl = 3, price = 20, qty = 5, vpn = false },
			{ item = "purgecontroller", coin = "VRM", rep = "Racing", repLvl = 3, price = 50, qty = 5, vpn = false },
			{ item = "harness", coin = "VRM", rep = "Racing", repLvl = 1, price = 20, qty = 5, vpn = false },
			{ item = "alias_changer", coin = "VRM", rep = "Racing", repLvl = 5, price = 2000, qty = 2, vpn = true },
			{
				item = "lsundg_invite",
				coin = "VRM",
				price = 100,
				qty = -1,
				vpn = true,
				state = "ACCESS_LSUNDG_INVITE",
				limited = { id = 1, qty = 5 },
			},
			{ item = "nitrous", coin = "VRM", price = 10, qty = 10, vpn = true },
		},
	},

	Crypto = {
		coins = {
			{ name = "Vroom", short = "VRM", startPrice = 100, volatile = false, volatilityCap = false },
			{ name = "Mald", short = "MALD", startPrice = 250, volatile = true, volatilityCap = 190 },
		},
	},

	Chopper = {
		item = { item = "chopping_invite", coin = "MALD", price = 600, vpn = true, rep = "Chopping", repLvl = 3, limited = { id = 1, qty = 1 } },
		vendorLocation = vector3(-623.589, -1681.736, 19.101),
		vendorHeading = 228.222,
		installNotifyDelay = 5000,
	},

	Music = {
		royaltyPerPlay = 250,
		maxRoyaltyPerHour = 500, -- not currently enforced, cap check is commented out in music.lua
		payoutIntervalMs = 1000 * 60 * 60,
		royaltyCompanies = { "triad" },
	},

	Comanager = {
		hireOfferCooldown = 300,
	},

	Services = {
		blacklistedJobs = {
			police = true,
			prison = true,
			ems = false,
			dgang = true,
			lsfc = true,
			greycat_shipping = true,
			government = true,
			tow = true,
			demonetti_storage = true,
		},
		cacheTimeMs = 60000,
	},

	-- unused elsewhere in dyn8.lua - pre-existing incomplete feature, kept as-is
	Dyn8 = {
		govCutPercent = 5,
		commissionCutPercent = 5,
		companyCutPercent = 10,
	},
}
