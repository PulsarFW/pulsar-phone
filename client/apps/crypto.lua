RegisterNUICallback("GetCryptoCoins", function(data, cb)
	local p = promise.new()

	plsr.Callbacks:ServerCallback("Crypto:GetAll", {}, function(coins)
		p:resolve(coins)
	end)

	cb(Citizen.Await(p))
end)

RegisterNUICallback("BuyCrypto", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Crypto:Buy", data, cb)
end)

RegisterNUICallback("SellCrypto", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Crypto:Sell", data, cb)
end)

RegisterNUICallback("TransferCrypto", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Crypto:Transfer", data, cb)
end)