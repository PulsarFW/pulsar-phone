local config = load(LoadResourceFile(GetCurrentResourceName(), "config/server.lua"))()

_royalty = config.Music.royaltyPerPlay
_maxRoyaltyPerHour = config.Music.maxRoyaltyPerHour
_pendingShopDeposits = {}
_royaltyCompanies = {}
for _, company in ipairs(config.Music.royaltyCompanies) do
	_royaltyCompanies[company] = { royalty = _royalty }
end
_startingPendingDepositThread = false

AddEventHandler("Phone:Server:RegisterCallbacks", function()
	plsr.Callbacks:RegisterServerCallback("Music:Server:SendRoyalties", function(source, data, cb)
		local song = data.title
		local label = string.lower(data.label_name)

		for key, value in pairs(_royaltyCompanies) do
			if string.find(label, key) then
				_pendingShopDeposits[key].royalties[data.id] = _pendingShopDeposits[key].royalties[data.id]
					or { total = 0, song = song, label = label, played = 0 }
				--if _pendingShopDeposits[key].royalties[data.id].total < _maxRoyaltyPerHour then
				_pendingShopDeposits[key].royalties[data.id].total += value.royalty
				_pendingShopDeposits[key].royalties[data.id].played += 1
				--end
			end
		end

		cb(true)
	end)
end)

AddEventHandler("Phone:Server:Startup", function()
	for k, v in pairs(_royaltyCompanies) do
		local t = plsr.Banking.Accounts:GetOrganization(k)
		if t then
			_pendingShopDeposits[k] = {
				bank = t.Account,
				royalties = {},
			}
		else
			plsr.Logger:Warn("Phone", string.format("Organization bank account for '%s' not ready yet (normal on first server start before pulsar_finance seeds accounts), skipping royalties until next restart", k))
		end
	end

	if not _startingPendingDepositThread then
		_startingPendingDepositThread = true
		CreateThread(function()
			while true do
				Wait(config.Music.payoutIntervalMs)
				for k, v in pairs(_pendingShopDeposits) do
					for k2, v2 in pairs(v.royalties) do
						plsr.Logger:Trace(
							"Phone",
							string.format("Depositing ^2$%s^7 To ^3%s^7 For Royalties", v2.total, v.bank)
						)

						plsr.Banking.Balance:Deposit(v.bank, v2.total, {
							type = "deposit",
							title = "Royalty Fee",
							description = string.format("Royalties for %s - Number of Plays %s", v2.song, v2.played),
							data = {
								song = v2.song,
								played = v2.played,
								label = v2.label,
							},
						}, true)

						v.royalties[k2] = nil
					end
				end
			end
		end)
	end
end)
