AddEventHandler("Phone:Server:RegisterMiddleware", function()
	plsr.Middleware:Add("Phone:Spawning", function(source, char)
		return {
			{
				type = "garages",
				data = plsr.Vehicles.Garages:GetAll(),
			},
		}
	end)
end)

AddEventHandler("Phone:Server:RegisterCallbacks", function()
	plsr.Callbacks:RegisterServerCallback("Phone:Garage:GetCars", function(source, data, cb)
		local src = source
		local char = plsr.Fetch:CharacterSource(src)
		plsr.Vehicles.Owned:GetAll(nil, 0, char:GetData("SID"), cb)
	end)

	plsr.Callbacks:RegisterServerCallback("Phone:Garage:TrackVehicle", function(source, data, cb)
		cb(plsr.Vehicles.Owned:Track(data))
	end)
end)
