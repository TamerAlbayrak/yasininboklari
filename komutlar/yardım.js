const Discord = require('discord.js');
const client = new Discord.Client()
const { stripIndents } = require('common-tags');
const ayarlar = require('../ayarlar.json');
const disbut = require('discord-buttons');
disbut(client);

exports.run = (client, message, args) => {
	if (!args[0]) {
		const help = {}
		client.commands.forEach((command) => {
			const cat = command.conf.kategori;
			if (!help.hasOwnProperty(cat)) help[cat] = [];
			help[cat].push(`\`${command.help.name}\``);
		})
		var str = ''
		for (const kategori in help) {
			str += `**${kategori.charAt(0).toUpperCase() + kategori.slice(1)}** ${help[kategori].join(" | ")}\n\n`
		}

		const embed = new Discord.MessageEmbed()
			.setAuthor(`${client.user.username} Komutları`)
			.setDescription(`= Komut Listesi =\n[Komut hakkında bilgi icin ${ayarlar.prefix}yardim <komut adi>]\n\n${str}`)
			.setTimestamp()
			.setColor("BLUE")
let button = new disbut.MessageButton()
   .setStyle('url')
  .setURL('https://gorevyoneticisi.cf/') 
  .setLabel('Web Sitemiz') 
let button1 = new disbut.MessageButton()
   .setStyle('url')
  .setURL('https://gorevyoneticisi.cf/') 
  .setLabel('Test') 



		message.channel.send(embed, {buttons:  [button, button1]})
		return
	}
	
}

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["help"],
  permLevel: 0
};

exports.help = {
  name: "yardım",
  description: "Tüm komutları gösterir.",
  usage: "yetkili "
};
