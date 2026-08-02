AddEventHandler("Phone:Server:RegisterMiddleware", function()
    plsr.Middleware:Add("Phone:Spawning", function(source, char)
		return {
			{
				type = "jobs",
				data = plsr.Labor.Get:Jobs(),
			},
			{
				type = "workGroups",
				data = plsr.Labor.Get:Groups(),
			},
		}
	end)
end)

PHONE.Labor = {}

AddEventHandler("Phone:Server:RegisterCallbacks", function()
	plsr.Callbacks:RegisterServerCallback("Phone:Labor:CreateWorkgroup", function(source, data, cb)
		local char = plsr.Fetch:CharacterSource(source)
		local myDuty = plsr.State:Player(source).onDuty

		if myDuty and (myDuty == "police" or myDuty == "ems") then
			plsr.Logger:Trace(
				"Labor",
				string.format(
					"%s %s (%s) Attempted To Create Workgroup (%s)",
					char:GetData("First"),
					char:GetData("Last"),
					char:GetData("SID"),
					myDuty
				)
			)
			DropPlayer(
				source,
				string.format("%s", "Double dipping jobs is not allowed. Don't do it again - instead, go off duty.")
			)
			cb(false)
		else
			if char:GetData("ICU") ~= nil and not char:GetData("ICU").Released then
				cb(false)
			else
				cb(plsr.Labor.Workgroups:Create(source))
			end
		end
	end)

	plsr.Callbacks:RegisterServerCallback("Phone:Labor:DisbandWorkgroup", function(source, data, cb)
		local char = plsr.Fetch:CharacterSource(source)
		if char:GetData("ICU") ~= nil and not char:GetData("ICU").Released then
			cb(false)
		else
			cb(plsr.Labor.Workgroups:Disband(source, true))
		end
	end)

	plsr.Callbacks:RegisterServerCallback("Phone:Labor:JoinWorkgroup", function(source, data, cb)
		local char = plsr.Fetch:CharacterSource(source)
		local myDuty = plsr.State:Player(source).onDuty
		if myDuty and (myDuty == "police" or myDuty == "ems") then
			plsr.Logger:Trace(
				"Labor",
				string.format(
					"%s %s (%s) Attempted To Join Workgroup (%s)",
					char:GetData("First"),
					char:GetData("Last"),
					char:GetData("SID"),
					myDuty
				)
			)
			DropPlayer(
				source,
				string.format("%s", "Double dipping jobs is not allowed. Don't do it again - instead, go off duty.")
			)
			cb(false)
		else
			if char:GetData("ICU") ~= nil and not char:GetData("ICU").Released then
				cb(false)
			else
				cb(plsr.Labor.Workgroups:Request(data, source))
			end
		end
	end)

	plsr.Callbacks:RegisterServerCallback("Phone:Labor:LeaveWorkgroup", function(source, data, cb)
		local char = plsr.Fetch:CharacterSource(source)
		if char:GetData("ICU") ~= nil and not char:GetData("ICU").Released then
			cb(false)
		else
			cb(plsr.Labor.Workgroups:Leave(data, source))
		end
	end)

	plsr.Callbacks:RegisterServerCallback("Phone:Labor:StartLaborJob", function(source, data, cb)
		local char = plsr.Fetch:CharacterSource(source)
		local myDuty = plsr.State:Player(source).onDuty
		if myDuty and (myDuty == "police" or myDuty == "ems") then
			plsr.Logger:Trace(
				"Labor",
				string.format(
					"%s %s (%s) Attempted To Double Dip Jobs (%s and %s)",
					char:GetData("First"),
					char:GetData("Last"),
					char:GetData("SID"),
					myDuty,
					data.job
				)
			)
			DropPlayer(
				source,
				string.format("%s", "Double dipping jobs is not allowed. Don't do it again - instead, go off duty.")
			)
			cb(false)
		else
			if char:GetData("ICU") ~= nil and not char:GetData("ICU").Released then
				cb(false)
			else
				cb(plsr.Labor.Duty:On(data.job, source, data.isWorkgroup))
			end
		end
	end)

	plsr.Callbacks:RegisterServerCallback("Phone:Labor:QuitLaborJob", function(source, data, cb)
		local char = plsr.Fetch:CharacterSource(source)
		if char:GetData("ICU") ~= nil and not char:GetData("ICU").Released then
			cb(false)
		else
			cb(plsr.Labor.Duty:Off(data, source))
		end
	end)
end)
