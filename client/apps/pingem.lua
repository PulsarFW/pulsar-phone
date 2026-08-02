RegisterNUICallback("PingEm:Send", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:PingEm:SendPing", data, cb)
end)

local _pingId = 1
AddEventHandler("Phone:Client:PingEm:AcceptPing", function(data)
	local id = string.format("pingem-%s", _pingId)
	_pingId = _pingId + 1

	local blip = plsr.Blips:Add(id, "Ping'Em", data.location, 280, 50, 1.1)
	SetBlipFlashes(blip, true)
	plsr.Callbacks:ServerCallback("Phone:PingEm:GetFeedback", {
		result = true,
		source = data.source,
	})

	CreateThread(function()
		Wait(30000)
		plsr.Blips:Remove(id)
	end)
end)

AddEventHandler("Phone:Client:PingEm:RejectPing", function(data)
	plsr.Callbacks:ServerCallback("Phone:PingEm:GetFeedback", {
		result = false,
		source = data.source,
	})
end)
