local config = load(LoadResourceFile(GetCurrentResourceName(), "config/server.lua"))()

AddEventHandler("Crypto:Server:Startup", function()
	for _, coin in ipairs(config.Crypto.coins) do
		plsr.Crypto.Coin:Create(coin.name, coin.short, coin.startPrice, coin.volatile, coin.volatilityCap)
	end

    -- Compatability since we're renaming MALD
	plsr.Middleware:Add("Characters:Spawning", function(source)
		local char = plsr.Fetch:CharacterSource(source)
		local myCrypto = char:GetData("Crypto")

		if myCrypto.PLEB ~= nil then
			myCrypto.MALD = myCrypto.PLEB
			myCrypto.PLEB= nil	
			char:SetData("Crypto", myCrypto)
		end
	end, 1)
end)

AddEventHandler("Phone:Server:RegisterCallbacks", function()
	plsr.Callbacks:RegisterServerCallback("Phone:Crypto:Buy", function(source, data, cb)
		local char = plsr.Fetch:CharacterSource(source)
		if char then
			return cb(plsr.Crypto.Exchange:Buy(data.Short, char:GetData("SID"), data.Quantity))
		end
		cb(false)
	end)

	plsr.Callbacks:RegisterServerCallback("Phone:Crypto:Sell", function(source, data, cb)
		local char = plsr.Fetch:CharacterSource(source)
		if char then
			return cb(plsr.Crypto.Exchange:Sell(data.Short, char:GetData("SID"), data.Quantity))
		end
		cb(false)
	end)

	plsr.Callbacks:RegisterServerCallback("Phone:Crypto:Transfer", function(source, data, cb)
		local char = plsr.Fetch:CharacterSource(source)
		if char and char:GetData("SID") ~= data.Target then
			return cb(plsr.Crypto.Exchange:Transfer(data.Short, char:GetData("SID"), data.Target, data.Quantity))
		end
		cb(false)
	end)
end)
