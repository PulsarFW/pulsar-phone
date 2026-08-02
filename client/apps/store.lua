RegisterNUICallback("Install", function(data, cb)
	if data.check then
		plsr.Callbacks:ServerCallback("Phone:Store:Install:Check", data.app, cb, data.app)
	else
		plsr.Callbacks:ServerCallback("Phone:Store:Install:Do", data.app, function(status, app, time)
			if status then
				plsr.Phone.Notification:Add("App Installed", nil, time, 6000, data.app, {
					view = "",
				}, nil)
			end
			cb(status)
		end, data.app)
	end
end)
RegisterNUICallback("Uninstall", function(data, cb)
	if data.check then
		plsr.Callbacks:ServerCallback("Phone:Store:Uninstall:Check", data.app, cb, data.app)
	else
		plsr.Callbacks:ServerCallback("Phone:Store:Uninstall:Do", data.app, cb, data.app)
	end
end)

-- recomputed fresh each time the Store screen opens rather than baked into
-- the one-time SET_APPS payload, so a job/state change mid-session (e.g.
-- using the Chopper invite item) is reflected without needing a relog
RegisterNUICallback("Store:GetCatalog", function(data, cb)
	local unlocked = {}
	if PHONE_APPS ~= nil then
		for name, appdata in pairs(PHONE_APPS) do
			if appdata.restricted then
				unlocked[name] = plsr.Phone:IsAppUnlocked(name)
			end
		end
	end
	cb(unlocked)
end)
