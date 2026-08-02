RegisterNUICallback("Banking:GetData", function(data, cb)
	plsr.Callbacks:ServerCallback('Banking:GetAccounts', {}, function(accounts, pendingBills)
		cb({
			accounts = accounts,
			pendingBills = pendingBills or {},
		})
	end)
end)

-- Transfer

RegisterNUICallback("Banking:Transfer", function(data, cb)
	data.action = 'TRANSFER'
	plsr.Callbacks:ServerCallback('Banking:DoAccountAction', data, function(success)
		if success then
			plsr.Callbacks:ServerCallback('Banking:GetAccounts', {}, function(accounts, pendingBills)
				plsr.Phone.Data:Set('bankLoans', {
					accounts = accounts,
					pendingBills = pendingBills or {},
				})
				cb(true)
			end)
		else
			cb(false)
		end
	end)
end)

-- Bills

RegisterNUICallback("Banking:AcceptBill", function(data, cb)
	plsr.Callbacks:ServerCallback('Billing:AcceptBill', data, function(success)
		cb(success)
	end)
end)

RegisterNUICallback("Banking:DismissBill", function(data, cb)
	plsr.Callbacks:ServerCallback('Billing:DismissBill', data, function(success)
		cb(success)
	end)
end)

RegisterNUICallback("Banking:Bill", function(data, cb)
	plsr.Callbacks:ServerCallback('Billing:CreateBill', data, function(success)
		cb(success)
	end)
end)

RegisterNUICallback("Banking:GetTransactions", function(data, cb)
	plsr.Callbacks:ServerCallback("Banking:GetAccountsTransactions", data, cb)
end)

AddEventHandler("Phone:Nui:Bank:AcceptBill", function(data)
	plsr.Callbacks:ServerCallback('Billing:AcceptBill', {
		bill = data.bill,
		notify = true
	})
end)

AddEventHandler("Phone:Nui:Bank:DenyBill", function(data)
	plsr.Callbacks:ServerCallback('Billing:DismissBill', data)
end)