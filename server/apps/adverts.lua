local _adverts = {
	["0"] = {},
}
PHONE.Adverts = {
	Create = function(self, source, advert)
		_adverts[source] = advert
		TriggerClientEvent("Phone:Client:AddData", -1, "adverts", advert, source)
	end,
	Update = function(self, source, advert)
		_adverts[source] = advert
		TriggerClientEvent("Phone:Client:UpdateData", -1, "adverts", source, advert)
	end,
	Delete = function(self, source)
		if _adverts[source] ~= nil then
			_adverts[source] = nil
			TriggerClientEvent("Phone:Client:RemoveData", -1, "adverts", source)
		end
	end,
}

AddEventHandler("Phone:Server:RegisterCallbacks", function()
	plsr.Callbacks:RegisterServerCallback("Phone:Adverts:Create", function(source, data, cb)
		plsr.Phone.Adverts:Create(source, data)
	end)
	plsr.Callbacks:RegisterServerCallback("Phone:Adverts:Update", function(source, data, cb)
		plsr.Phone.Adverts:Update(source, data)
	end)
	plsr.Callbacks:RegisterServerCallback("Phone:Adverts:Delete", function(source, data, cb)
		plsr.Phone.Adverts:Delete(source)
	end)
end)

AddEventHandler("Phone:Server:RegisterMiddleware", function()
	plsr.Middleware:Add("Phone:Spawning", function(source, char)
		return {
			{
				type = "adverts",
				data = _adverts,
			},
		}
	end)
end)

AddEventHandler("Characters:Server:PlayerLoggedOut", function(source, cData)
	plsr.Phone.Adverts:Delete(source)
end)

AddEventHandler("Characters:Server:PlayerDropped", function(source, cData)
	plsr.Phone.Adverts:Delete(source)
end)
