_limited = false
_payphone = false

local disabling = false
local function DisableKeys()
	if disabling then return end
	disabling = true
	CreateThread(function()
		while disabling do
			DisablePlayerFiring(PlayerId(), true) -- Disable weapon firing
			DisableControlAction(0, 0, true) -- LookLeftRight
			DisableControlAction(0, 1, true) -- LookLeftRight
			DisableControlAction(0, 2, true) -- LookUpDown
			DisableControlAction(0, 24, true) -- disable attack
			DisableControlAction(0, 25, true) -- disable aim
			DisableControlAction(0, 37, true) -- disable weapon select
			DisableControlAction(0, 47, true) -- disable weapon
			DisableControlAction(0, 58, true) -- disable weapon
			DisableControlAction(0, 140, true) -- disable melee
			DisableControlAction(0, 141, true) -- disable melee
			DisableControlAction(0, 142, true) -- disable melee
			DisableControlAction(0, 143, true) -- disable melee
			DisableControlAction(0, 177, true) -- disable melee
			DisableControlAction(0, 199, true) -- disable melee
			DisableControlAction(0, 200, true) -- disable melee
			DisableControlAction(0, 201, true) -- disable melee
			DisableControlAction(0, 245, true) -- disable melee
			DisableControlAction(0, 263, true) -- disable melee
			DisableControlAction(0, 264, true) -- disable melee
			DisableControlAction(0, 257, true) -- disable melee
			DisableControlAction(0, 322, true) -- disable melee
			Wait(1)
		end
	end)
end

PHONE = {
	Open = function(self)
		_limited = false
		_payphone = false
		plsr.Inventory.Close:All()
		plsr.Interaction:Hide()
		plsr.State.flags.phoneOpen = true
		DisplayRadar(true)
		plsr.Hud:ShiftLocation(true)
		PhonePlayIn()
		SendNUIMessage({ type = "PHONE_VISIBLE" })
		SetNuiFocus(true, true)
	end,
	OpenLimited = function(self)
		_limited = true
		_payphone = false
		plsr.Inventory.Close:All()
		plsr.Interaction:Hide()
		plsr.State.flags.phoneOpen = true
		PhonePlayIn()
		SendNUIMessage({ type = "PHONE_VISIBLE_LIMITED" })
		SetNuiFocus(true, true)
	end,
	OpenPayphone = function(self)
		_limited = true
		_payphone = true
		plsr.Inventory.Close:All()
		plsr.Interaction:Hide()
		plsr.State.flags.phoneOpen = true
		PhonePlayIn()
		SendNUIMessage({ type = "PHONE_VISIBLE_LIMITED" })
		SetNuiFocus(true, true)
	end,
	Close = function(self, forced, doJankyStuff)
		plsr.State.flags.phoneOpen = false
		_openCd = true
		if not doJankyStuff then
			plsr.Phone:ResetRoute()
		end
		if forced then
			SendNUIMessage({ type = "PHONE_NOT_VISIBLE_FORCED" })
		else
			SendNUIMessage({ type = "PHONE_NOT_VISIBLE" })
		end
		if _limited then
			plsr.Phone.Call:End()
		end
		SendNUIMessage({ type = "ALERTS_RESET" })
		if not IsPedInAnyVehicle(PlayerPedId(), true) then
			DisplayRadar(plsr.State.flags.loggedIn and hasValue(plsr.State.character.States, "GPS"))
		end
		plsr.Hud:ShiftLocation(plsr.State.flags.loggedIn and hasValue(plsr.State.character.States, "GPS"))
		if not plsr.Phone.Call:Status() or _limited then
			PhonePlayOut()
		end
		SetNuiFocus(false, false)
		SetNuiFocusKeepInput(false)
		TriggerEvent("UI:Client:Close", "phone")

		_limited = false
	end,
	IsOpen = function(self)
		return plsr.State.flags.phoneOpen
	end,
	ResetRoute = function(self)
		SendNUIMessage({ type = "CLEAR_HISTORY" })
	end,
	-- InsertUSB = function(self, data)
	-- 	SendNUIMessage({ type = "INSTALL_USB", data = data })
	-- end,
	-- RemoveUSB = function(self)
	-- 	SendNUIMessage({ type = "REMOVE_USB" })
	-- end,
	ReceiveShare = function(self, data)
		SendNUIMessage({ type = "RECEIVE_SHARE", data = data })
	end,
	Permissions = {
		Load = function(self, p)
			SendNUIMessage({
				type = "LOAD_PERMS",
				data = p,
			})
		end,
	},
	-- shared by IsAppUsable and the store catalog's unlocked-flag lookup -
	-- mirrors server component.lua's IsAppUnlocked, keep both in sync
	IsAppUnlocked = function(self, app)
		if PHONE_APPS == nil then
			return false
		end
		local appdata = PHONE_APPS[app]
		if appdata == nil then
			return false
		end
		if not appdata.restricted then
			return true
		end
		local r = appdata.restricted
		if r.job then
			for jobId, gradeLevel in pairs(r.job) do
				if plsr.Jobs.Permissions:HasJob(jobId, r.workplace, r.grade, gradeLevel) then
					return true
				end
				if r.jobPermission and plsr.Jobs.Permissions:HasJob(jobId, r.workplace, r.grade, gradeLevel, false, r.jobPermission) then
					return true
				end
			end
		end
		if r.state and hasValue(plsr.State.character.States, r.state) then
			return true
		end
		if r.phonePermission and plsr.Phone.Permissions:HasPermission(r.phonePermission.app, r.phonePermission.permission) then
			return true
		end
		if r.repuation and plsr.Reputation:HasLevel(r.repuation, r.repuationAmount or 0) then
			return true
		end
		return false
	end,
	IsAppUsable = function(self, app)
		if type(app) == "table" then
			return true
		elseif PHONE_APPS == nil then
			return false
		else
			return PHONE_APPS[app] ~= nil
				and hasValue(plsr.State.character.Apps.installed, app)
				and plsr.Phone:IsAppUnlocked(app)
		end
	end,
	Data = {
		Set = function(self, key, data)
			SendNUIMessage({ type = "SET_DATA", data = { type = key, data = data } })
		end,
		Add = function(self, type, data, key)
			SendNUIMessage({ type = "ADD_DATA", data = { type = type, data = data, key = key } })
		end,
		Update = function(self, type, id, data)
			SendNUIMessage({ type = "UPDATE_DATA", data = { type = type, id = id, data = data } })
		end,
		Remove = function(self, key, id)
			SendNUIMessage({ type = "REMOVE_DATA", data = { type = key, id = id } })
		end,
		Reset = function(self)
			SendNUIMessage({ type = "RESET_DATA" })
		end,
	},
	Notification = {
		Add = function(self, title, description, time, duration, app, actions, notifData)
			if
				not plsr.State.flags.loggedIn or not hasValue(plsr.State.character.States, "PHONE")
			then
				return
			end

			local appUsable = plsr.Phone:IsAppUsable(app)
			if
				_settings.notifications
				and (type(app) == "table" or (appUsable and not _settings.appNotifications[app]) or app == "comanager")
				and not plsr.Jail:IsJailed()
			then
				SendNUIMessage({
					type = "NOTIF_ADD",
					data = {
						notification = {
							title = title,
							description = description,
							time = time,
							duration = duration,
							app = app,
							action = actions,
							data = notifData,
							show = true,
						},
					},
				})

				if not plsr.State.flags.phoneOpen and (plsr.Phone:IsAppUsable(app)) then
					plsr.Sounds.Play:One(_settings.texttone, 0.1 * (_settings.volume / 100))
				end
			end
		end,
		AddWithId = function(self, id, title, description, time, duration, app, actions, notifData)
			SendNUIMessage({
				type = "NOTIF_ADD",
				data = {
					notification = {
						id = id,
						title = title,
						description = description,
						time = time,
						duration = duration,
						app = app,
						action = actions,
						data = notifData,
						show = true,
					},
				},
			})
		end,
		Update = function(self, id, title, description)
			SendNUIMessage({
				type = "NOTIF_UPDATE",
				data = {
					id = id,
					title = title,
					description = description,
				},
			})
		end,
		Remove = function(self, id)
			SendNUIMessage({
				type = "NOTIF_HIDE",
				data = {
					id = id,
				},
			})
		end,
		Reset = function(self)
			SendNUIMessage({ type = "NOTIF_DISMISS_ALL" })
		end,
	},
	SetExpanded = function(self, state)
		SendNUIMessage({
			type = "SET_EXPANDED",
			data = {
				expanded = state,
			},
		})
	end,
	Permissions = {
		HasPermission = function(self, app, permission)
			local myPerms = plsr.State.character.PhonePermissions
			if not app or not permission then
				return false
			else
				return PhonePermissions[app][permission]
			end
		end,
	},
}

AddEventHandler("Proxy:Shared:RegisterReady", function()
	exports["pulsar_core"]:RegisterComponent("Phone", PHONE)
end)

RegisterNetEvent("Phone:Client:Close", function()
	plsr.Phone:Close()
end)

RegisterNUICallback("ClosePhone", function(data, cb)
	cb("OK")
	plsr.Phone:Close()
end)

RegisterNetEvent("Phone:Client:Notifications:Add", function(title, description, time, duration, app, actions, notifData)
	plsr.Phone.Notification:Add(title, description, time, duration, app, actions, notifData)
end)

RegisterNetEvent(
	"Phone:Client:Notifications:AddWithId",
	function(id, title, description, time, duration, app, actions, notifData)
		plsr.Phone.Notification:AddWithId(id, title, description, time, duration, app, actions, notifData)
	end
)

RegisterNetEvent("Phone:Client:Notifications:Update", function(id, title, description)
	plsr.Phone.Notification:Update(id, title, description)
end)

RegisterNetEvent("Phone:Client:Notifications:Remove", function(id)
	plsr.Phone.Notification:Remove(id)
end)
