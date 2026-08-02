local config = load(LoadResourceFile(GetCurrentResourceName(), "config/server.lua"))()

PHONE.Email = {
	Read = function(self, charId, id)
		return MySQL.update.await("UPDATE character_emails SET unread = ? WHERE id = ?", {
			false,
			id,
		}) > 0
	end,
	Send = function(self, serverId, sender, time, subject, body, flags, expires)
		local char = plsr.Fetch:CharacterSource(serverId)
		if char ~= nil then
			local id = MySQL.insert.await(
				"INSERT INTO character_emails (sid, sender, subject, body, timestamp, flags, expires) VALUES(?, ?, ?, ?, FROM_UNIXTIME(?), ?, FROM_UNIXTIME(?))",
				{
					char:GetData("SID"),
					sender,
					subject,
					body,
					time,
					flags and json.encode(flags) or nil,
					expires,
				}
			)

			local doc = {
				id = id,
				owner = char:GetData("SID"),
				sender = sender,
				subject = subject,
				body = body,
				time = time,
				unread = true,
				flags = flags,
				expires = expires,
			}

			TriggerClientEvent("Phone:Client:Email:Receive", serverId, doc)
		end
	end,
	Delete = function(self, charId, id)
		MySQL.query("DELETE FROM character_emails WHERE sid = ? AND id = ?", {
			charId,
			id,
		})

		local char = plsr.Fetch:SID(charId)
		if char then
			TriggerClientEvent("Phone:Client:Email:Delete", char:GetData("Source"), id)
		end
	end,
}

AddEventHandler("Phone:Server:RegisterMiddleware", function()
	plsr.Middleware:Add("Characters:Spawning", function(source)
		local char = plsr.Fetch:CharacterSource(source)
		local alias = char:GetData("Alias")
		local profiles = char:GetData("Profiles") or {}

		if alias.email then
			local rid = MySQL.insert.await(
				"INSERT INTO character_app_profiles (sid, app, name, picture, meta) VALUES(?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), picture = VALUES(picture), meta = VALUES(meta)",
				{
					char:GetData("SID"),
					"email",
					alias.email,
					nil,
					"{}",
				}
			)

			profiles.email = {
				sid = char:GetData("SID"),
				app = "email",
				name = alias.email,
				picture = nil,
				meta = {},
			}

			alias.email = nil
			char:SetData("Alias", alias)
			char:SetData("Profiles", profiles)
		end

		if not profiles.email then
			local emailaddr = string.format("%s_%s%s@" .. config.Phone.emailDomain, char:GetData("First"), char:GetData("Last"), char:GetData("SID"))
			local rid = MySQL.insert.await(
				"INSERT INTO character_app_profiles (sid, app, name, picture, meta) VALUES(?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), picture = VALUES(picture), meta = VALUES(meta)",
				{
					char:GetData("SID"),
					"email",
					emailaddr,
					nil,
					"{}",
				}
			)
			profiles.email = {
				sid = char:GetData("SID"),
				app = "email",
				name = emailaddr,
				picture = nil,
				meta = {},
			}
			char:SetData("Profiles", profiles)
		end
	end, 2)

	plsr.Middleware:Add("Phone:Spawning", function(source, char)
		local emails = MySQL.rawExecute.await(
			"SELECT id, sid, sender, subject, body, UNIX_TIMESTAMP(timestamp) as time, flags, expires FROM character_emails WHERE sid = ? AND (expires IS NULL or expires > NOW()) ORDER BY time DESC LIMIT " .. config.Pagination.emailsOnSpawn,
			{
				char:GetData("SID"),
			}
		)

		for k, v in ipairs(emails) do
			if v.flags ~= nil then
				v.flags = json.decode(v.flags)
			end
		end

		return {
			{
				type = "emails",
				data = emails,
			},
		}
	end)

	plsr.Middleware:Add("Phone:CreateProfiles", function(source, cData)
		local name = string.format("%s_%s%d@" .. config.Phone.emailDomain, cData.First, cData.Last, cData.SID)

		local id = MySQL.insert.await("INSERT INTO character_app_profiles (sid, app, name) VALUES(?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), picture = VALUES(picture), meta = VALUES(meta)", {
			cData.SID,
			"email",
			name,
		})

		return {
			{
				app = "email",
				profile = {
					sid = cData.SID,
					app = "email",
					name = name,
					picture = nil,
					meta = {},
				},
			},
		}
	end)
end)

AddEventHandler("Phone:Server:RegisterCallbacks", function()
	plsr.Chat:RegisterAdminCommand("email", function(source, args, rawCommand)
		local char = plsr.Fetch:SID(tonumber(args[1]))
		if char ~= nil then
			plsr.Phone.Email:Send(char:GetData("Source"), args[2], os.time(), args[3], args[4])
		else
			plsr.Chat.Send.System:Single(source, "Invalid State ID")
		end
	end, {
		help = "Send Email To Player",
		params = {
			{
				name = "Target",
				help = "State ID",
			},
			{
				name = "Sender Email",
				help = "Email To Show As Sender, EX: scaryman@something.net",
			},
			{
				name = "Subject",
				help = "Subject Line Of Email",
			},
			{
				name = "Body",
				help = "Body of email to send",
			},
		},
	}, 4)

	plsr.Callbacks:RegisterServerCallback("Phone:Email:Read", function(source, data, cb)
		cb(plsr.Phone.Email:Read(data))
	end)

	plsr.Callbacks:RegisterServerCallback("Phone:Email:Delete", function(source, data, cb)
		local src = source
		local char = plsr.Fetch:CharacterSource(src)
		cb(plsr.Phone.Email:Delete(char:GetData("SID"), data))
	end)

	plsr.Callbacks:RegisterServerCallback("Phone:Email:DeleteExpired", function(source, data, cb)
		local char = plsr.Fetch:CharacterSource(source)
		if char ~= nil then
			local ids = MySQL.rawExecute.await(
				"SELECT id FROM character_emails WHERE sid = ? AND expires IS NOT NULL and expires < NOW()",
				{
					char:GetData("SID"),
				}
			)

			local idsraw = {}
			for k, v in ipairs(ids) do
				table.insert(idsraw, v.id)
			end

			MySQL.query("DELETE FROM character_emails WHERE id IN (" .. table.concat(idsraw) .. ")")

			cb(idsraw)
		end
	end)
end)
