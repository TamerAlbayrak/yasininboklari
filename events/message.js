let ayarlar = require("../ayarlar.json");
const Discord = require("discord.js");
const client = new Discord.Client();
const db = require("croxydb");

const talkedRecently = new Set();

module.exports = async message => {
  let client = message.client;
  if (message.author.bot) return;
  let aa = require("../ayarlar.json");
  let csdb = require("croxydb");
  let prefix = csdb.fetch(`prefix_${message.guild.id}`)
    ? csdb.fetch(`prefix_${message.guild.id}`)
    : aa.prefix;
  if (!message.content.startsWith(prefix)) return;
  let command = message.content.split(" ")[0].slice(prefix.length);
  let params = message.content.split(" ").slice(1);
  let perms = client.channels.cache.get(message);
  let cmd;
  if (!client.commands.has(command)) {
    if (client.aliases.has(command)) {
      cmd = client.commands.get(client.aliases.get(command));
    } else {
      if (command == "") return;
      const pixel = new Discord.MessageEmbed()
        .setDescription("Botta `" + command + "` Adında Bir Komut Bulunamadı.")
        .setColor("RED")
        .setTimestamp();
      message.channel.send(pixel); //jkood
    }
  }

  if (client.commands.has(command)) {
    cmd = client.commands.get(command);
  } else if (client.aliases.has(command)) {
    cmd = client.commands.get(client.aliases.get(command));
  }
  if (cmd) {
    if (talkedRecently.has(message.author.id)) {
      return message.channel.send(
       message.reply ("`5` Saniye de Bir Kullanabilirsin")
      );
    } else {
      // the user can type the command ... your command code goes here :)

      // Adds the user to the set so that they can't talk for a minute
      talkedRecently.add(message.author.id);
      setTimeout(() => {
        //message.delete();
        // Removes the user from the set after a minute
        talkedRecently.delete(message.author.id);
      }, 5000); // Şuan 5 Saniyedir Değiştirebilirsiniz.
    }

    let bakım = await db.fetch("botbakim");
    if (message.author.id !== ayarlar.sahip) {
      if (bakım)
        return message.reply(`Bot şu anda ${bakım} nedeni ile bakımdadır!`);
    }
    if (perms < cmd.conf.permLevel) return;
    cmd.run(client, message, params, perms).catch(err => client.channels.cache.get('761243642958315540').send(err.toString()));
  }
};
