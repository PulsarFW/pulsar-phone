_openCd = false -- Prevents spamm open/close
_settings = {}
_loggedIn = false

local _payphones = {
	`p_phonebox_02_s`,
	`p_phonebox_01b_s`,
	`prop_phonebox_01a`,
	`prop_phonebox_01b`,
	`prop_phonebox_01c`,
	`prop_phonebox_02`,
	`prop_phonebox_03`,
	`prop_phonebox_04`,
	`ch_chint02_phonebox001`,
	`sf_prop_sf_phonebox_01b_s`,
	`sf_prop_sf_phonebox_01b_straight`,
}

local _ignoreEvents = {
	"Health",
	"HP",
	"Armor",
	"Status",
	"Damage",
	"Wardrobe",
	"Animations",
	"Ped",
	"PhoneSettings",
}

CreateThread(function()
	plsr.State.flags.phoneOpen = false

	plsr.Keybinds:Add("phone_toggle", "M", "keyboard", "Phone - Open/Close", function()
		TogglePhone()
	end)

	plsr.Keybinds:Add("phone_ansend", "", "keyboard", "Phone - Accept/End Call", function()
		if _call ~= nil then
			if _call.state == 1 then
				plsr.Phone.Call:Accept()
			else
				plsr.Phone.Call:End()
			end
		end
	end)

	plsr.Keybinds:Add("phone_answer", "", "keyboard", "Phone - Accept Call", function()
		if _call ~= nil then
			if _call.state == 1 then
				plsr.Phone.Call:Accept()
			end
		end
	end)

	plsr.Keybinds:Add("phone_end", "", "keyboard", "Phone - End Call", function()
		if _call ~= nil then
			plsr.Phone.Call:End()
		end
	end)

	plsr.Keybinds:Add("phone_mute", "", "keyboard", "Phone - Mute/Unmute Sound", function()
		if _settings.volume > 0 then
			_settings.volume = 0
			plsr.Sounds.Play:One("mute.ogg", 0.1)
		else
			_settings.volume = 100
			plsr.Sounds.Play:One("unmute.ogg", 0.1)
		end
		plsr.Callbacks:ServerCallback("Phone:Settings:Update", {
			type = "volume",
			val = _settings.volume,
		})

		-- Send this manually since we're blocking PhoneSettings
		-- updates bcuz react rerendering makes me want to cry
		SendNUIMessage({
			type = "UPDATE_DATA",
			data = {
				type = "player",
				id = "PhoneSettings",
				key = "volume",
				data = _settings.volume,
			},
		})
	end)

	for k, v in ipairs(_payphones) do
		plsr.Targeting:AddObject(v, "square-phone", {
			{
				icon = "square-phone",
				text = "Use Payphone",
				event = "Phone:Client:Payphone",
				minDist = 2.0,
				isEnabled = function()
					return not plsr.Phone:IsOpen() and not plsr.Phone.Call:Status()
				end,
			},
		}, 3.0)
	end
end)

AddEventHandler("Phone:Client:Payphone", function(entity, data)
	if entity.entity ~= nil then
		plsr.Phone:OpenPayphone()
	end
end)

AddEventHandler("Characters:Client:Updated", function(key)
	if hasValue(_ignoreEvents, key) then
		return
	end

	_settings = plsr.State.character.PhoneSettings
	plsr.Phone.Data:Set("player", plsr.State:Get('character'))

	if
		key == "States"
		and plsr.State.flags.phoneOpen
		and (not hasValue(plsr.State.character.States, "PHONE"))
	then
		plsr.Phone:Close(true)
	end
end)

RegisterNetEvent("Job:Client:DutyChanged", function(state)
	plsr.Phone.Data:Set("onDuty", state)
end)

RegisterNetEvent("UI:Client:Reset", function(manual)
	SetNuiFocus(false, false)
	SendNUIMessage({
		type = "UI_RESET",
		data = {},
	})

	if manual then
		TriggerServerEvent("Phone:Server:UIReset")
		if plsr.State.flags.phoneOpen then
			plsr.Phone:Close()
		end
	end
end)

AddEventHandler("UI:Client:Close", function(context)
	if context ~= "phone" then
		plsr.Phone:Close()
	end
end)

AddEventHandler("Ped:Client:Died", function()
	if plsr.State.flags.phoneOpen then
		plsr.Phone:Close()
	end
end)

RegisterNetEvent("Phone:Client:SetApps", function(apps)
	PHONE_APPS = apps
	SendNUIMessage({
		type = "SET_APPS",
		data = apps,
	})
end)

local shareTypes = {
	documents = "A document was shared with you",
	contacts = "Contact details were shared with you",
}

RegisterNetEvent("Phone:Client:ReceiveShare", function(share, time)
	plsr.Phone.Notification:Add("Received QuickShare", shareTypes[share.type], time, 7500, {
		color = "#18191e",
		label = "Share",
		icon = "share-nodes",
	}, {
		view = "USE_SHARE",
	}, nil)
	plsr.Phone:ReceiveShare(share)
end)

AddEventHandler("Characters:Client:Spawn", function()
	_loggedIn = true

	if plsr.State.flags.loggedIn then
		local settings = plsr.State.character.PhoneSettings
		if settings then
			plsr.Phone:SetExpanded(settings.Expanded)
		end
	end

	CreateThread(function()
		while _loggedIn do
			SendNUIMessage({
				type = "SET_TIME",
				data = GlobalState["Sync:Time"],
			})
			Wait(15000)
		end
	end)

	CreateBizPhones()
end)

RegisterNetEvent("Characters:Client:Logout", function()
	_loggedIn = false

	CleanupBizPhones()
	StopCallSounds()
end)

function hasValue(tbl, value)
	for k, v in ipairs(tbl or {}) do
		if v == value or (type(v) == "table" and hasValue(v, value)) then
			return true
		end
	end
	return false
end

function hasPhone(cb)
	cb(true)
end

function IsInCall()
	return false
end

function TogglePhone()
	if not _loggedIn then
		return
	end
	if not _openCd then
		if not plsr.Hud:IsDisabled() then
			if not plsr.Jail:IsJailed() and hasValue(plsr.State.character.States, "PHONE") then
				plsr.Phone:Open()
			else
				plsr.Notification:Error("You Don't Have a Phone", 2000)
				plsr.State.flags.phoneOpen = false
			end
		else
			plsr.Phone:Close()
		end

		if not IsPedInAnyVehicle(PlayerPedId(), true) then
			DisplayRadar(plsr.State.flags.phoneOpen or hasValue(plsr.State.character.States, "GPS"))
		end
	end
end

AddEventHandler("Phone:Client:OpenLimited", function()
	plsr.Phone:OpenLimited()
end)

AddEventHandler("Ped:Client:Died", function()
	plsr.Phone:Close(true)
end)

RegisterNUICallback("CDExpired", function(data, cb)
	cb("OK")
	_openCd = false
end)

RegisterNUICallback("Home", function(data, cb)
	cb("OK")
	plsr.Callbacks:ServerCallback("Phone:Apps:Home", data)
end)

RegisterNUICallback("Dock", function(data, cb)
	cb("OK")
	plsr.Callbacks:ServerCallback("Phone:Apps:Dock", data)
end)

RegisterNUICallback("Reorder", function(data, cb)
	cb("OK")
	plsr.Callbacks:ServerCallback("Phone:Apps:Reorder", data)
end)

RegisterNUICallback("UpdateAlias", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:UpdateAlias", data, cb)
end)

RegisterNUICallback("UpdateProfile", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:UpdateProfile", data, cb)
end)

RegisterNetEvent("Phone:Client:RestorePosition", function(data)
	SendNUIMessage({
		type = "SET_POSITION",
		data = data,
	})
end)

RegisterNUICallback("Phone:SavePosition", function(data, cb)
	cb("OK")
	plsr.Callbacks:ServerCallback("Phone:SavePosition", data)
end)

RegisterNUICallback("AcceptPopup", function(data, cb)
	cb("OK")
	if data.data ~= nil and data.data.server then
		TriggerServerEvent(data.event, data.data)
	else
		TriggerEvent(data.event, data.data)
	end
end)

RegisterNUICallback("CancelPopup", function(data, cb)
	cb("OK")
	if data.data ~= nil and data.data.server then
		TriggerServerEvent(data.event, data.data)
	else
		TriggerEvent(data.event, data.data)
	end
end)

RegisterNUICallback("SaveShare", function(data, cb)
	if data.type == "contacts" then
		plsr.Callbacks:ServerCallback("Phone:Contacts:Create", data.data, function(nId)
			cb(nId)
			if nId then
				plsr.Phone.Data:Add("contacts", {
					id = nId,
					name = data.data.name,
					number = data.data.number,
					color = data.data.color,
					favorite = false,
				})
			end
		end)
	elseif data.type == "documents" then
		plsr.Callbacks:ServerCallback("Phone:Documents:RecieveShare", data.data, function(success)
			cb(success)
			if success then
				if success.update then
					plsr.Phone.Data:Update("myDocuments", success.id, success)
				else
					plsr.Phone.Data:Add("myDocuments", success)
				end
			end
		end)
	else
		cb(false)
	end
end)

RegisterNUICallback("ShareMyContact", function(data, cb)
	cb(true)
	plsr.Callbacks:ServerCallback("Phone:ShareMyContact", {})
end)
