local config = load(LoadResourceFile(GetCurrentResourceName(), "config/server.lua"))()

PHONE.Store = {
	Install = {
		Check = function(self, source, app)
			Wait(5e3)
			return plsr.Phone:IsAppUnlocked(source, app)
		end,
		Do = function(self, app, apps, method)
			if not hasValue(apps.installed, app) then
				table.insert(apps.installed, app)
				if #apps.home < config.Phone.homeAppLimit then
					table.insert(apps.home, app)
				end
			end
			return apps
		end,
	},
	Uninstall = {
		Check = function(self, app)
			Wait(5e3)
			return true
		end,
		Do = function(self, app, apps)
			local newApps = { installed = {}, home = {}, dock = {} }
			for k, v in ipairs(apps.installed) do
				if v ~= app then
					table.insert(newApps.installed, v)
				end
			end
			for k, v in ipairs(apps.home) do
				if v ~= app then
					table.insert(newApps.home, v)
				end
			end
			for k, v in ipairs(apps.dock) do
				if v ~= app then
					table.insert(newApps.dock, v)
				end
			end
			return newApps
		end,
	},
}
AddEventHandler("Phone:Server:RegisterCallbacks", function()
	plsr.Callbacks:RegisterServerCallback("Phone:Store:Install:Check", function(src, data, cb)
		CreateThread(function()
			cb(plsr.Phone.Store.Install:Check(src, data))
		end)
	end)
	plsr.Callbacks:RegisterServerCallback("Phone:Store:Install:Do", function(src, data, cb)
		local char = plsr.Fetch:CharacterSource(src)
		CreateThread(function()
			-- Check is a separate round-trip the client calls first for UX (loading
			-- ring animation) - re-validated here too since nothing stops a modified
			-- client from calling this directly and skipping Check entirely
			if char == nil or not plsr.Phone:IsAppUnlocked(src, data) then
				cb(false)
				return
			end
			char:SetData("Apps", plsr.Phone.Store.Install:Do(data, char:GetData("Apps"), "store"))
			cb(true, PHONE_APPS[data], os.time())
		end)
	end)
	plsr.Callbacks:RegisterServerCallback("Phone:Store:Uninstall:Check", function(src, data, cb)
		local char = plsr.Fetch:CharacterSource(src)
		CreateThread(function()
			cb(plsr.Phone.Store.Uninstall:Check(data))
		end)
	end)
	plsr.Callbacks:RegisterServerCallback("Phone:Store:Uninstall:Do", function(src, data, cb)
		local char = plsr.Fetch:CharacterSource(src)
		CreateThread(function()
			local nApps = plsr.Phone.Store.Uninstall:Do(data, char:GetData("Apps"))
			char:SetData("Apps", nApps)
			cb(true)
		end)
	end)
end)
