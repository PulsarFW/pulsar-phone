fx_version 'cerulean'
game 'gta5'

name 'Pulsar Phone'
description 'In-game smartphone with 26 apps, home screen, and a live-race HUD'
author 'Artmines - maintained for Pulsar Framework'
url 'https://pulsarframe.work'
version 'v1.0.0'

version_check 'yes'
github 'https://github.com/PulsarFW/pulsar_phone'

client_script '@pulsar_core/components/cl_error.lua'
shared_script '@pulsar_core/core/sh_pulsar.lua'
client_script '@pulsar_pwnzor/client/check.lua'
server_script '@oxmysql/lib/MySQL.lua'

client_scripts({
	'client/*.lua',
	'client/apps/**/*.lua',
})

server_scripts({
	'server/*.lua',
	'server/apps/**/*.lua',
})

files({
	'ui/dist/index.html',
	'ui/dist/assets/*',
	'ui/images/frames/*.png',
	'ui/images/wallpapers/*.webp',
})

ui_page 'ui/dist/index.html'
lua54 'yes'
