RegisterNUICallback("Loans:GetData", function(data, cb)
	plsr.Callbacks:ServerCallback('Loans:GetLoans', {}, function(characterLoansData)
		cb(characterLoansData)
	end)
end)

RegisterNUICallback("Loans:Payment", function(data, cb)
	plsr.Callbacks:ServerCallback('Loans:Payment', data, function(res, updatedCharacterLoansData)
        if res and res.success and updatedCharacterLoansData then
            plsr.Phone.Data:Set('bankLoans', updatedCharacterLoansData)
        end

		cb(res)
	end)
end)