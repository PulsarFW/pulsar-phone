RegisterNUICallback("Services:GetServices", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Services:GetServices", data, function(servicesData)
		cb(servicesData)
	end)
end)

RegisterNUICallback("Services:SetGPS", function(data, cb)
	if data.location then
		DeleteWaypoint()
		SetNewWaypoint(data.location.x, data.location.y)
		plsr.Notification:Success("GPS route set")
		cb("OK")
	else
		cb(false)
		plsr.Notification:Error("Error setting waypoint.")
	end
end)
