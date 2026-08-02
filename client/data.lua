RegisterNetEvent("Phone:Client:SetData", function(type, data, options)
	plsr.Phone.Data:Set(type, data)
end)

RegisterNetEvent("Phone:Client:SetDataMulti", function(data)
	for k, v in ipairs(data) do
		plsr.Phone.Data:Set(v.type, v.data)
	end
end)

RegisterNetEvent("Phone:Client:AddData", function(type, data, id)
	plsr.Phone.Data:Add(type, data, id)
end)

RegisterNetEvent("Phone:Client:UpdateData", function(type, id, data)
	plsr.Phone.Data:Update(type, id, data)
end)

RegisterNetEvent("Phone:Client:RemoveData", function(type, id)
	plsr.Phone.Data:Remove(type, id)
end)

RegisterNetEvent("Phone:Client:ResetData", function()
	plsr.Phone.Data:Reset()
end)

RegisterNetEvent("Characters:Client:Logout", function()
	SendNUIMessage({ type = "PHONE_NOT_VISIBLE" })
	plsr.Phone.Data:Reset()
	plsr.Phone.Notification:Reset()
	plsr.Phone:ResetRoute()
end)
