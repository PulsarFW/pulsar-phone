_call = nil
local _calling = false

function StartCallTimeout()
	if _calling then
		return
	end
	_calling = true
	if plsr.State.flags.phoneOpen then
		PhoneTextToCall()
	else
		PhonePlayCall(false)
	end
	CreateThread(function()
		local count = 0
		while _calling do
			Wait(1)
			if count < 3000 then
				count = count + 1
			else
				plsr.Phone.Call:End()
				_calling = false
			end
		end
	end)
end

function StopCallSounds()
	plsr.Sounds.Stop:Distance(GetPlayerServerId(plsr.State.flags.PlayerID), _settings.ringtone or "ringtone1.ogg")
	plsr.Sounds.Stop:One("ringing.ogg")
	plsr.Sounds.Stop:One("vibrate.ogg")
end

PHONE.Call = {
	Create = function(self, data)
		local p = promise.new()
		plsr.Sounds.Loop:One("ringing.ogg", 0.1 * (_settings.volume / 100))
		SendNUIMessage({ type = "SET_CALL_PENDING", data = { number = data.number } })
		data.limited = _limited

		if _payphone then
			data.isAnon = true
		end
		plsr.Callbacks:ServerCallback("Phone:Phone:CreateCall", data, function(status)
			if status then
				_call = {
					id = 1,
					state = 0,
					number = data.number,
					duration = -1,
					method = 1,
				}

				StartCallTimeout()
				p:resolve(true)
			else
				p:resolve(false)
			end
		end)
		return Citizen.Await(p)
	end,
	Recieve = function(self, id, number, limited)
		_call = {
			id = id,
			state = 1,
			number = number,
			duration = -1,
			method = 0,
		}
		SendNUIMessage({ type = "SET_CALL_INCOMING", data = { number = number, limited = limited } })
		if _settings and _settings.volume > 0 then
			plsr.Sounds.Loop:Distance(10, _settings.ringtone or "ringtone1.ogg", 0.1 * (_settings.volume / 100))
		else
			plsr.Sounds.Loop:One("vibrate.ogg", 0.1)
		end
	end,
	Accept = function(self)
		StopCallSounds()
		if plsr.State.flags.phoneOpen then
			PhoneTextToCall()
		end
		plsr.Callbacks:ServerCallback("Phone:Phone:AcceptCall", _call)
	end,
	End = function(self)
		_calling = false
		StopCallSounds()
		plsr.Callbacks:ServerCallback("Phone:Phone:EndCall")
	end,
	Read = function(self)
		plsr.Callbacks:ServerCallback("Phone:Phone:ReadCalls")
	end,
	Status = function(self)
		return _call ~= nil
	end,
}

AddEventHandler("Characters:Client:Updated", function(key)
	if key == "States" and _call ~= nil then
		plsr.Phone.Call:End()
	end
end)

AddEventHandler("Phone:Client:RemovePhone", function()
	if _call ~= nil then
		plsr.Phone.Call:End()
	end
end)

AddEventHandler("Ped:Client:Died", function()
	if _call ~= nil then
		plsr.Phone.Call:End()
	end
end)

RegisterNetEvent("Jail:Client:Jailed", function()
	if _call ~= nil then
		plsr.Phone.Call:End()
	end
end)

RegisterNetEvent("Hospital:Client:ICU:Sent", function()
	if _call ~= nil then
		plsr.Phone.Call:End()
	end
end)

RegisterNetEvent("Characters:Client:Logout", function()
	if _call ~= nil then
		plsr.Phone.Call:End()
	end
end)

RegisterNetEvent("Phone:Client:Phone:EndCall", function()
	SendNUIMessage({ type = "END_CALL" })
	_call = nil

	StopCallSounds()

	CreateThread(function()
		Wait(100)
		plsr.Sounds.Play:One("ended.ogg", 0.15)
	end)

	if plsr.State.flags.phoneOpen then
		PhoneCallToText()
	else
		PhonePlayOut()
	end
end)

RegisterNetEvent("Phone:Client:Phone:RecieveCall", function(id, number, limited)
	if plsr.Jail:IsJailed() then
		TriggerEvent("Phone:Nui:Phone:EndCall")
	else
		plsr.Phone.Call:Recieve(id, number, limited)
	end
end)

RegisterNetEvent("Phone:Client:Phone:AcceptCall", function(number)
	_calling = false
	_call.state = 2
	_call.duration = 0
	StopCallSounds()
	SendNUIMessage({ type = "SET_CALL_ACTIVE" })
	PhonePlayCall(false)
end)

AddEventHandler("Phone:Nui:Phone:AcceptCall", function()
	StopCallSounds()
	plsr.Phone.Call:Accept()
end)

AddEventHandler("Phone:Nui:Phone:EndCall", function()
	StopCallSounds()
	plsr.Phone.Call:End()
end)

RegisterNUICallback("CreateCall", function(data, cb)
	cb(plsr.Phone.Call:Create(data))
end)

RegisterNUICallback("AcceptCall", function(data, cb)
	cb("OK")
	StopCallSounds()
	plsr.Phone.Call:Accept()
end)

RegisterNUICallback("EndCall", function(data, cb)
	cb("OK")
	StopCallSounds()
	plsr.Phone.Call:End()
end)

RegisterNUICallback("ReadCalls", function(data, cb)
	cb("OK")
	plsr.Phone.Call:Read()
end)
