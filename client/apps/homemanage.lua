RegisterNUICallback("Home:GetMyProperties", function(data, cb)
	local props = plsr.Properties:GetPropertiesWithAccess() or {}

	local upgrades = plsr.Properties:GetUpgradesConfig()

	cb({
		properties = props,
		upgrades = upgrades,
	})
end)

RegisterNUICallback("Home:StartPlacement", function(data, cb)
	cb(false)
end)

RegisterNUICallback("Home:CreateDigiKey", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Home:CreateDigiKey", data, cb)
end)

RegisterNUICallback("Home:RevokeDigiKey", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Home:RevokeDigiKey", data, cb)
end)

RegisterNUICallback("Home:RemoveMyKey", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Home:RemoveMyKey", data, cb)
end)

RegisterNUICallback("Home:LockProperty", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Home:LockProperty", data, cb)
end)

RegisterNUICallback("Home:EditMode", function(data, cb)
	plsr.Properties.Furniture:EditMode()
	cb("OK")
end)

RegisterNUICallback("Home:GetCurrentFurniture", function(data, cb)
	local p = plsr.Properties.Furniture:GetCurrent(data.property)
	cb(p)
end)

RegisterNUICallback("Home:PlaceFurniture", function(data, cb)
	-- model, category
	cb(plsr.Properties.Furniture:Place(data.model, data.category))
end)

RegisterNUICallback("Home:EditFurniture", function(data, cb)
	cb(plsr.Properties.Furniture:Move(data.id))
end)

RegisterNUICallback("Home:DeleteFurniture", function(data, cb)
	cb(plsr.Properties.Furniture:Delete(data.id))
end)

RegisterNUICallback("Home:HighlightFurniture", function(data, cb)
	cb(false)
	--cb(Properties.Furniture:Find(data.id))
end)

RegisterNUICallback("PurchasePropertyInterior", function(data, cb)
	-- data.int
	plsr.Callbacks:ServerCallback("Properties:ChangeInterior", data, cb)
end)

RegisterNUICallback("PurchasePropertyUpgrade", function(data, cb)
	-- data.upgrade
	plsr.Callbacks:ServerCallback("Properties:Upgrade", data, cb)
end)

RegisterNUICallback("PreviewPropertyInterior", function(data, cb)
	-- data.int
	cb("OK")
	plsr.Properties.Interiors:Preview(data.int)
end)