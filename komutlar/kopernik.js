const Discord = require('discord.js');
const db = require("croxydb");
const client = new Discord.Client();

exports.run = async (client, message, args) => {

			
const Yardım = new Discord.MessageEmbed()
.setTitle('Kopernik Pizza.') 
.setColor('PURPLE')
.setImage('https://c.tenor.com/iUbu5KH-pz0AAAAd/kopernik-pizza-recep-ivedik.gif')
message.channel.send(Yardım)

}
          
exports.conf = {
 enabled: true,
 guildOnly: false,
 aliases: ['kopernik'],
 permLevel: 0 ,
};

exports.help = {
 name: 'kopernikpizza',
 description: 'Alkışlanıyor...',
 usage: 'alkış'
};