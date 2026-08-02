RegisterNetEvent("Phone:Client:Messages:SetThreads", function(data)
	SendNUIMessage({
		type = "SET_MESSAGE_THREADS",
		data = {
			threads = data,
		},
	})
end)

RegisterNetEvent("Phone:Client:Messages:Notify", function(message)
	SendNUIMessage({
		type = "UPDATE_THREAD_IF_EXISTS",
		data = {
			thread = {
				id = message.id,
				owner = message.owner,
				number = message.number,
				type = 0,
				time = message.time,
				message = message.message,
			},
		},
	})

	SendNUIMessage({
		type = "RECEIVED_NEW_MESSAGE",
		data = message,
	})

	if message.contact then
		plsr.Phone.Notification:Add(message.contact.name, message.message, message.time, 6000, "messages", {
			view = "convo/" .. message.number,
		}, nil)
	else
		plsr.Phone.Notification:Add(message.number, message.message, message.time, 6000, "messages", {
			view = "convo/" .. message.number,
		}, nil)
	end

	if not plsr.State.flags.phoneOpen then
		SendNUIMessage({
			type = "ADD_UNREAD",
			data = {
				name = "messages",
				count = 1,
			},
		})
	end
end)

RegisterNUICallback("Messages:InitLoad", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Message:InitLoad", {}, cb)
end)

RegisterNUICallback("Messages:LoadTexts", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Messages:LoadTexts", data, cb)
end)

RegisterNUICallback("SendMessage", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Messages:SendMessage", data, cb)
end)
RegisterNUICallback("ReadConvo", function(data, cb)
	cb("OK")
	plsr.Callbacks:ServerCallback("Phone:Messages:ReadConvo", data)
end)
RegisterNUICallback("DeleteConvo", function(data, cb)
	plsr.Callbacks:ServerCallback("Phone:Messages:DeleteConvo", data, cb)
end)
