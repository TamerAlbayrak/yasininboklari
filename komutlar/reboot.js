const Discord = require('discord.js');
const db = require('croxydb');


exports.run = (client, message, args) => {
	if (message.author.id !== "333146288289742850") return message.reply(':no_entry: Vay Çakal Bu Sahibimin Komutu')
    else {
    message.channel.send(`Yeniden başlatılıyor...`).then(msg => {
message.channel.send(":white_check_mark: Yeniden Başlıyorum");
console.log(`Command Test : Yeniden Başlatılıyor...`);
process.exit(0);
	})
	}

};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: 0
};

exports.help = {
  name: 'reboot',
  description: 'Botu Yeniden Başlatır.',
  usage: 'reboot'
};