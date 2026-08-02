RegisterNUICallback("UpdateSetting", function(data, cb)
	cb("OK")
	_settings[data.type] = data.val
	plsr.Callbacks:ServerCallback("Phone:Settings:Update", data)
end)

local testingSound = nil
RegisterNUICallback("TestSound", function(data, cb)
	cb("OK")

	if testingSound ~= nil then
		plsr.Sounds.Stop:One(testingSound)
		testingSound = nil
	end

	testingSound = data.val
	plsr.Sounds.Play:One(data.val, 0.1 * (_settings.volume / 100))
end)
