const chalk = require('chalk')
const moment = require('moment')
const Discord = require('discord.js')
const ayarlar = require('../ayarlar.json')
const express = require("express");
const app = express();

var prefix= ayarlar.prefix;

module.exports = client => {
 console.log(`${client.guilds.cache.size} Kadar Sunucuya Hizmet Veriyorum!`);
 client.user.setActivity("with depression", {
  type: "STREAMING",
  url: "https://www.twitch.tv/gorev_yoneticisi"
});

};