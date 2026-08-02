RegisterNetEvent("Phone:Client:Labor:NotifyEnd", function(time)
	plsr.Phone.Notification:Add("Job Activity", "You finished a job", time, 6000, "labor", {}, nil)
end)

RegisterNUICallback("GetLaborDetails", function(data, cb)
	cb({
		jobs = plsr.Labor.Get:Jobs(),
		groups = plsr.Labor.Get:Groups(),
		reputations = plsr.Labor.Get:Reputations(),
	})
end)

RegisterNUICallback("CreateWorkgroup", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Labor:CreateWorkgroup", data, cb)
end)

RegisterNUICallback("JoinWorkgroup", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Labor:JoinWorkgroup", data, cb)
end)

RegisterNUICallback("DisbandWorkgroup", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Labor:DisbandWorkgroup", data, cb)
end)

RegisterNUICallback("LeaveWorkgroup", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Labor:LeaveWorkgroup", data, cb)
end)

RegisterNUICallback("StartLaborJob", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Labor:StartLaborJob", data, cb)
end)

RegisterNUICallback("QuitLaborJob", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Labor:QuitLaborJob", data, cb)
end)
