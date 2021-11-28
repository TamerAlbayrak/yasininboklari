const Discord = require("discord.js");
const moment = require("moment");
const os = require("os");
let cpuStat = require("cpu-stat");


exports.run = async (client, message, args) => {


          let start = Date.now(); message.channel.send("Botun İstatistikleri;").then(message => {
          let diff = (Date.now() - start);
          let API = (client.ws.ping).toFixed()
  
      let cpuLol;
    cpuStat.usagePercent(function(err, percent, seconds) {
        if (err) {
            return console.log(err);
        }
const istatistikler = new Discord.MessageEmbed()
.setColor("#00ccff")
.setThumbnail(`https://cdn.discordapp.com/attachments/577046670857076758/821428310449324082/eeeae.png`)
.addField(":bar_chart: Botun Bilgileri","** **")
.setFooter("© 2021 command test v12", client.user.avatarURL('https://cdn.discordapp.com/attachments/577046670857076758/821428310449324082/eeeae.png'))
.addField(" :hammer_pick: Geliştirici :", "<@333146288289742850>", true)
.addField(" :bust_in_silhouette:  Kullanıcı Sayısı",client.guilds.cache.reduce((a, b) => a + b.memberCount, 0).toLocaleString(), true)
.addField(":clipboard: Sunucu Sayısı", client.guilds.cache.size.toLocaleString(), true)
.addField(":bar_chart: Kanal Sayısı", client.channels.cache.size.toLocaleString(), true)
.addField(":level_slider: Bellek Kullanımı",(process.memoryUsage().heapUsed / 1024 / 512).toFixed(2) + " MB",true)
 .addField(":pager: CPU Kullanımı", `%${percent.toFixed(1)}`, true)
//.addField(`:scroll: »  Pingim` ,`${client.ws.ping}ms`,true)
 .addField("» **Gecikme süreleri**","Mesaj Gecikmesi: {ping1} ms \nBot Gecikmesi: {ping2} ms"
        .replace("{ping1}", `${diff}ms`)
           //.replace("{ping1}", new Date().getTime() - message.createdTimestamp)
        .replace("{ping2}", client.ws.ping),true)
 .addField(":desktop: İşletim Sistemi",`${os.platform()}`,true)
  .addField(":compass: CPU", `\`\`\`md\n${os.cpus().map(i => `${i.model}`)[0]}\`\`\``, true)
  .addField(":paperclip: Kuruluş Tarihi", "26 Ocak 2021", true)
  .addField(`:cd: » Node Sürümü`, `${process.version}`, true)
.addField(":minidisc: Discord sürümü", "v" + Discord.version, true)
//.addField(`»‎‎‎‎ Bağlantılar`, `[ :e_mail: Sunucuna Ekle](https://discord.gg) | [  Oy ver](https://discord.gg) | [  Destek sunucusu](https://discord.gg) | [ Site](https://discord.gg) | [ Site](https://discord.gg)`,)
const fetch = require("node-fetch");  
const kanal = message.channel.id;

  const butonmesaj = "Web Sitemizi Ziyaret Et"
    fetch(`https://discord.com/api/v9/channels/${kanal}/messages`, {
        method: "POST",
        body: JSON.stringify({"embed":istatistikler,
            "components": 
            [
              {
                "type": 1,
                "components": [
                    {
                        "type": 2,
                        "label": butonmesaj,
                        "style": 5,
                        "url": "https://gorevyoneticisi.cf/"
                    }
]

                
                
            }
              
              
            ],

                             }),
        headers: {
            "Authorization": `Bot ${client.token}`,
            "Content-Type": "application/json"
        }
    })  
 /* message.channel.send(istatistikler) */
  
    })
    });
};
  
exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ['istatistik'],
  permLevel: 0
};

exports.help = {
  name: 'i',
  description: 'istatistik sistemi',
  usage: 'istatistik'
}; 