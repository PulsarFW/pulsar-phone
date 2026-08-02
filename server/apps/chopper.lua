local config = load(LoadResourceFile(GetCurrentResourceName(), "config/server.lua"))()

PHONE.Chopper = PHONE.Chopper or {}

local marketItems = { config.Chopper.item }

local _blacklistedJobs = {}
for _, job in ipairs(config.ProtectedJobs) do
	_blacklistedJobs[job] = true
end

AddEventHandler("Phone:Server:RegisterCallbacks", function()
	plsr.Vendor:Create("ChoperItems", "ped", "Items", `U_M_Y_SmugMech_01`, {
		coords = config.Chopper.vendorLocation,
		heading = config.Chopper.vendorHeading,
		scenario = "WORLD_HUMAN_TOURIST_MOBILE",
	}, marketItems, "dollar-sign", "View Offers", false, false, true)

	plsr.Inventory.Items:RegisterUse("chopping_invite", "LSUNDG", function(source, item, itemData)
		local char = plsr.Fetch:CharacterSource(source)
		if char ~= nil then
			local onDuty = plsr.State:Player(source).onDuty
			if not onDuty or not _blacklistedJobs[onDuty] then
				if not hasValue(char:GetData("States") or {}, "ACCESS_CHOPPER") then
					if plsr.Inventory.Items:RemoveSlot(item.Owner, item.Name, 1, item.Slot, 1) then
						local states = char:GetData("States") or {}
						table.insert(states, "ACCESS_CHOPPER")
						char:SetData("States", states)

						char:SetData("Apps", plsr.Phone.Store.Install:Do("chopper", char:GetData("Apps"), "force"))

						Citizen.SetTimeout(config.Chopper.installNotifyDelay, function()
							plsr.Phone.Notification:Add(source, "App Installed", nil, os.time(), config.NotificationDurations.short, "chopper", {
								view = "",
							}, nil)
						end)
					end
				else
					plsr.Execute:Client(source, "Notification", "Error", "You already have access to that app")
				end
			else
				plsr.Execute:Client(source, "Notification", "Error", "You Can't Use This Item")
			end
		end
	end)
end)