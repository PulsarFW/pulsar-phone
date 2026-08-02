AddEventHandler("Phone:Server:RegisterCallbacks", function()
	plsr.Callbacks:RegisterServerCallback("Phone:Settings:Update", function(source, data, cb)
		local src = source
		local char = plsr.Fetch:CharacterSource(src)
		local settings = char:GetData("PhoneSettings")
		settings[data.type] = data.val
		char:SetData("PhoneSettings", settings)
	end)
end)
