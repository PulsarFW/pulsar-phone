local config = load(LoadResourceFile(GetCurrentResourceName(), "config/server.lua"))()

local _selling = {}
local _pendingLoanAccept = {}

-- NOTE: these three were dead locals even before this move - nothing in this file reads them.
-- Left here (now sourced from config) rather than silently deleted, since they look like an
-- unfinished transaction-fee feature, not confirmed-dead code.
local govCut = config.Dyn8.govCutPercent
local commissionCut = config.Dyn8.commissionCutPercent
local companyCut = config.Dyn8.companyCutPercent

AddEventHandler("Phone:Server:RegisterCallbacks", function()
	plsr.Callbacks:RegisterServerCallback("Phone:Dyn8:Search", function(source, data, cb)
		local char = plsr.Fetch:CharacterSource(source)
		if char then
			local qry = {
				label = {
					["$regex"] = data,
					["$options"] = "i",
				},
				sold = false,
			}

			if plsr.State:Player(source).onDuty == 'realestate' then
				qry = {
					label = {
						["$regex"] = data,
						["$options"] = "i",
					},
				}
			end

			plsr.Database:Query(
				"SELECT `id`, `data` FROM `properties` WHERE `label` LIKE ? LIMIT " .. config.Pagination.dyn8SearchLimit,
				{ "%" .. data .. "%" },
				function(success, results)
					if not success then
						cb(false)
						return
					end

					local properties = {}
					for k, row in ipairs(results) do
						local ok, decoded = pcall(json.decode, row.data)
						if ok and type(decoded) == "table" then
							decoded._id = row.id
							table.insert(properties, decoded)
						end
					end
					cb(properties)
				end
			)
		else
			cb(false)
		end
	end)
end)



