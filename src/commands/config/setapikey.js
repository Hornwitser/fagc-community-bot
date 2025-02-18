const ConfigModel = require("../../database/schemas/config")
const Command = require("../../base/Command")

class SetAPIKey extends Command {
	constructor(client) {
		super(client, {
			name: "setapikey",
			description: "Set API key",
			aliases: [],
			usage: "[API KEY]",
			examples: [ "{{p}}setapikey potatoKey" ],
			category: "config",
			dirname: __dirname,
			enabled: true,
			memberPermissions: [ "ADMINISTRATOR" ],
			botPermissions: [ "SEND_MESSAGES", "EMBED_LINKS" ],
			ownerOnly: false,
			cooldown: 3000,
			requiredConfig: false,
			customPermissions: [ "setConfig" ],
		})
	}
	async run(message, args) {
		if (!args[0])
			return message.channel.send(
				`${this.client.emotes.warn} You must provide your API key as a parameter`
			)
		message.delete()
		message.channel.send(
			`${message.author}, Message removed to prevent unauthorized API access`
		)
		const apikey = args[0]

		try {
			const community =
				await this.client.fagc.communities.fetchOwnCommunity({
					reqConfig: {
						apikey: apikey
					}
				})
			if (community?.contact && community.contact !== message.author.id) {
				const contact = await this.client.users
					.fetch(community.contact)
					.catch()
				if (contact)
					contact.send(
						`${this.client.emotes.siren} User <@${message.author.id}> | ${message.author.tag} is attempting to use your API key in guild ${message.guild.name} (\`${message.guild.id}\`)`
					)
				if (community.guildIds.length)
					community.guildIds.map((guildId) => {
						this.client.fagc.info.notifyGuildText({
							guildId: guildId,
							text: `User ${message.author.tag} is attempting to use your API key in guild ${message.guild.name} (\`${message.guild.id}\`)`
						})
					})
				return message.channel.send(
					`${this.client.emotes.warn} You are not the community's owner, therefore you don't have access to set the API key!`
				)
			}
		} catch (e) {
			return message.channel.send(`${this.client.emotes.warn} Invalid API key sent`)
		}

		try {
			const community = await this.client.fagc.communities.fetchOwnCommunity({
				reqConfig: {
					apikey: apikey
				}
			})
			if (!community)
				return message.reply(`${this.client.emotes.warn} That API key is not associated with a community`)
			
			const config = await ConfigModel.findOneAndUpdate(
				{ guildId: message.guild.id },
				{
					$set: { apikey: apikey, communityId: community.id },
				},
				{ new: true }
			).then((c) => c.toObject())
			
			if (config.apikey && config.guildId === message.guild.id) {
				this.client.users
					.fetch(community.contact)
					.then((owner) =>
						owner?.send(
							`${this.client.emotes.success} User ${message.author} (${message.author.tag}) has set your API key to ||${apikey}||`
						)
					)
				return message.channel.send(
					`${message.author} set the API key successfully!`
				)
			} else throw config
		} catch (error) {
			message.channel.send(`${this.client.emotes.error} Error setting API key. Please check logs.`)
			throw error
		}
	}
}
module.exports = SetAPIKey
