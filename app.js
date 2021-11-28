const { Client, MessageEmbed, Util } = require("discord.js");
const Discord = require("discord.js");
const client = new Discord.Client();
const db = require("croxydb")
const express = require("express");
const app = express();
const conf = require("./src/configs/config.json");
const settings = require("./src/configs/settings.json");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const ejs = require("ejs");
const path = require("path");
const passport = require("passport");
const { Strategy } = require("passport-discord");
const session = require("express-session");
const mongoose = require("mongoose");
const url = require("url");
const moment = require("moment");
moment.locale("tr");
const cooldown = new Map();
require("./util/eventLoader.js")(client);
// </> Middlewares </>
app.engine(".ejs", ejs.__express);
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: "50mb", extended: false, }));
app.use(cookieParser());
app.set("views", path.join(__dirname, "src/views"));
app.use(express.static(__dirname + "/src/public"));
app.use(session({ secret: "secret-session-thing", resave: false, saveUninitialized: false, }));
app.use(passport.initialize());
app.use(passport.session());
// </> Middlewares </>

// </> Authorization </>
passport.serializeUser((user, done) => done(null, user));

passport.deserializeUser((obj, done) => done(null, obj));

const scopes = ["identify", "guilds"];
passport.use(new Strategy({
      clientID: settings.clientID,
      clientSecret: settings.secret,
      callbackURL: settings.callbackURL,
      scope: scopes,
    },
    (accessToken, refreshToken, profile, done) => {
      process.nextTick(() => done(null, profile));
    })
);

app.get("/login", passport.authenticate("discord", { scope: scopes, }));
app.get("/callback", passport.authenticate("discord", { failureRedirect: "/error", }), (req, res) => res.redirect("/"));
app.get("/logout", (req, res) => {
  req.logOut();
  return res.redirect("/");
});
// </> Authorization </>

// </> DB Connection </>
mongoose.connect(settings.mongoURL, {
	useUnifiedTopology: true,
	useNewUrlParser: true,
	useFindAndModify: false,
});

mongoose.connection.on("connected", () => {
	console.log("Connected to DB");
});

mongoose.connection.on("error", () => {
	console.error("Connection Error!");
});
// </> DB Connection </>

// </> Pages </>
app.get("/", async (req, res) => {
  const guild = client.guilds.cache.get(conf.guildID);
  const owners = guild.members.cache.filter(x => x.roles.cache.has(conf.ownerRole));
  const admins = guild.members.cache.filter(x => x.roles.cache.has(conf.adminRole) && !owners.find(b => x.user.id == b));
  const codeSharers = guild.members.cache.filter(x => x.roles.cache.has(conf.codeSharer) && !owners.find(b => x.user.id == b) && !admins.find(b => x.user.id == b));
  res.render("index", {
    user: req.user,
    icon: guild.iconURL({ dynamic: true }),
    bot: client,
    owners,
    path: req.path,
    member : req.isAuthenticated() ? req.user : null,
    admins,
    reduce: ((a, b) => a + b.memberCount, 0),
    codeSharers,
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  });
});

app.get("/discord", (req, res) => 
  res.render("discord", {
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    conf
  })
);

app.get("/information", (req, res) =>
  res.render("info", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  })
);

app.get("/profile/:userID", async (req, res) => {
  const userID = req.params.userID;
  const guild = client.guilds.cache.get(conf.guildID);
  const member = guild.members.cache.get(userID);
  if (!member) return error(res, 501, "Böyle bir kullanıcı bulunmuyor!");
  const userData = require("./src/schemas/user");
  const codeData = require("./src/schemas/code");
  let data = await userData.findOne({ userID });
  const code = await codeData.find({});
  let auth;
  if (member.roles.cache.has(conf.ownerRole)) auth = "Owner";
  else if (member.roles.cache.has(conf.adminRole)) auth = "Admin";
  else if (member.roles.cache.has(conf.codeSharer)) auth = "Code Sharer";
  else if (member.roles.cache.has(conf.booster)) auth = "Booster";
  else auth = "Member";
  res.render("profile", {
    user: req.user,
    member,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    auth,
    color: member.displayHexColor,
    data: data ? data : {},
    code,
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  });
});

app.get("/admin", async (req, res) => {
  if (!req.user) return error(res, 138, "Bu sayfaya girmek için siteye giriş yapmalısın!");
  const guild = client.guilds.cache.get(conf.guildID);
  const member = guild.members.cache.get(req.user.id);
  if (!member) return error(res, 138, "Bu sayfaya girmek için sunuzumuza katılmalısın!");
  if (!member.hasPermission(8)) return error(res, 401, "Bu sayfaya girmek için yetkin bulunmuyor!");
  const codeData = require("./src/schemas/code");
  const code = await codeData.find({}).sort({ date: -1 });
  res.render("admin", {
    user: req.user,
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    code
  });
});

app.get("/bug/:codeID", async (req, res) => {
  if (!req.user || !client.guilds.cache.get(conf.guildID).members.cache.has(req.user.id)) return error(res, 138, "Bu sayfaya girmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir.");
  res.render("bug", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null,
    codeID: req.params.codeID
  });
});

app.get("/bug", async (req, res) => {
  if (!req.user || !client.guilds.cache.get(conf.guildID).members.cache.has(req.user.id)) return error(res, 138, "Bu sayfaya girmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir.");
  res.render("bug", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null,
  });
});

app.post("/bug", async (req, res) => {
  const guild = client.guilds.cache.get(conf.guildID);
  const member = req.user ? guild.members.cache.get(req.user.id) : null;
  if (!req.user || !member) return error(res, 138, "Bu sayfaya girmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir.");
  const codeData = require("./src/schemas/code");
  console.log(req.body)
  const code = await codeData.findOne({ id: req.body.id });
  if (!code) return error(res, 404, req.body.id+" ID'li bir kod bulunamadı!");
  
  if (!code.bug) {
    code.bug = req.body.bug;
    code.save();
  } else return error(res, 208, "Bu kodda zaten bug bildirildi!")
  
  const channel = client.channels.cache.get(conf.bugLog);
  const embed = new MessageEmbed()
  .setAuthor(req.user.username, member.user.avatarURL({ dynamic: true }))
  .setThumbnail(guild.iconURL({ dynamic: true }))
  .setTitle("Bir bug bildirildi!")
  .setDescription(`
• Kod adı: [${code.name}](https://${conf.domain}/${code.rank}/${req.body.id})
• Bug bildiren: ${guild.members.cache.get(req.user.id).toString()}
• Bug: ${req.body.bug}
  `)
  .setColor("RED")
  channel.send(embed);
  res.redirect(`/${code.rank}/${req.body.id}`);
});

app.get("/share", async (req, res) => {
  if (!req.user || !client.guilds.cache.get(conf.guildID).members.cache.has(req.user.id)) return error(res, 138, "Kod paylaşabilmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir.");
  res.render("shareCode", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    isStaff: client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id).roles.cache.has(conf.codeSharer),
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  });
});

app.post("/sharing", async (req, res) => {
  const guild = client.guilds.cache.get(conf.guildID);
  const member = req.user ? guild.members.cache.get(req.user.id) : null;
  if (!req.user || !member) return error(res, 138, "Kod paylaşabilmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir.");
  const codeData = require("./src/schemas/code");
  const userData = require("./src/schemas/user");
  if (member && conf.notCodeSharer.some((x) => member.roles.cache.has(x) || member.user.id === x)) return error(res, 502, "Kod paylaşma iznin bulunmuyor!");
  if (cooldown.get(req.user.id) && cooldown.get(req.user.id).count >= 3) return error(res, 429, "10 dakika içerisinde en fazla 3 kod paylaşabilirsin!");
  const id = randomStr(8);
  
  let code = req.body;
  code.id = id;
  code.date = Date.now();
  if (!code.sharers) code.sharers = req.user.id;
  code.sharers = code.sharers.trim().split(" ").filter(x => guild.members.cache.get(x));
  if (code.sharers && !code.sharers.includes(req.user.id)) code.sharers.unshift(req.user.id);
  if (!code.modules) code.modules = "discord.js";
  if (!code.mainCode || code.mainCode && (code.mainCode.trim().toLowerCase() === "yok" || code.mainCode.trim() === "-")) code.mainCode = "";
  if (!code.command || code.command && (code.command.trim().toLowerCase() === "yok" || code.command.trim() === "-")) code.command = "";
  cooldown.get(req.user.id) ? cooldown.set(req.user.id, { count: cooldown.get(req.user.id).count += 1 }) : cooldown.set(req.user.id, { count: 1 });
  if (await cooldown.get(req.user.id).count === 1) setTimeout(() => cooldown.delete(req.user.id), 1000*60*10);
  
  code.sharers.map(async x => {
    const data = await userData.findOne({ userID: x });
    if (!data) {
      new userData({
        userID: x,
        codes: [code]
      }).save();
    } else {
      data.codes.push(code);
      data.save();
    }
  });
  
  let newCodeData = new codeData({
    name: code.name,
    id: code.id,
    sharers: code.sharers,
    desc: code.desc.trim(),
    modules: code.modules.trim(),
    mainCode: code.mainCode.trim(),
    command: code.command.trim(),
    rank: code.rank,
    date: code.date
  }).save();
  
  const channel = guild.channels.cache.get(conf.codeLog);
  let color;
  if (code.rank === "normal") color = "#bfe1ff";
  else if (code.rank === "gold") color = "#F1C531";
  else if (code.rank === "diamond") color = "#3998DB";
  else if (code.rank === "ready") color = "#f80000";
  else if (code.rank === "fromyou") color = ""
  const embed = new MessageEmbed()
  .setAuthor(req.user.username, member.user.avatarURL({ dynamic: true }))
  .setThumbnail(guild.iconURL({ dynamic: true }))
  .setTitle(`${code.rank} kategorisinde bir kod paylaşıldı!`)
  .setDescription(`
  • Kod adı: [${code.name}](https://${conf.domain}/${code.rank}/${id})
  • Kod Açıklaması: ${code.desc}
  • Kodu paylaşan: ${member.toString()}
  `)
  .setColor(color)
  channel.send(embed);
  res.redirect(`/${code.rank}/${id}`);
});

app.get("/normal", async (req, res) => {
  const codeData = require("./src/schemas/code");
  const data = await codeData.find({ rank: "normal" }).sort({ date: -1 });
  res.render("normalCodes", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    data,
    moment,
    guild: client.guilds.cache.get(conf.guildID),
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  });
});

app.get("/gold", async (req, res) => {
  const codeData = require("./src/schemas/code");
  const data = await codeData.find({ rank: "gold" }).sort({ date: -1 });
  res.render("goldCodes", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    data,
    moment,
    guild: client.guilds.cache.get(conf.guildID),
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  });
});

app.get("/diamond", async (req, res) => {
  const codeData = require("./src/schemas/code");
  const data = await codeData.find({ rank: "diamond" }).sort({ date: -1 });
  res.render("diamondCodes", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    data,
    moment,
    guild: client.guilds.cache.get(conf.guildID),
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  });
});

app.get("/ready", async (req, res) => {
  const codeData = require("./src/schemas/code");
  const data = await codeData.find({ rank: "ready" }).sort({ date: -1 });
  res.render("readySystems", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    data,
    moment,
    guild: client.guilds.cache.get(conf.guildID),
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  });
});

app.get("/fromyou", async (req, res) => {
  const codeData = require("./src/schemas/code");
  const data = await codeData.find({ rank: "fromyou" }).sort({ date: -1 });
  res.render("fromyou", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    data,
    moment,
    guild: client.guilds.cache.get(conf.guildID),
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  });
});

app.get("/normal/:codeID", async (req, res) => {
  if (!req.user || !client.guilds.cache.get(conf.guildID).members.cache.has(req.user.id)) return error(res, 138, "Kodları görebilmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir.");
  const guild = client.guilds.cache.get(conf.guildID);
  const member = req.user ? guild.members.cache.get(req.user.id) : null;
  if (member && !member.roles.cache.has(conf.booster) && !member.roles.cache.has(conf.ownerRole) && member.roles.cache.has(conf.adminRole)) return error(res, 501, "Bu kodu görebilmek için gerekli rolleriniz bulunmamaktadır! Lütfen bilgilendirme sayfasını okuyunuz!");
  const codeID = req.params.codeID;
  if (!codeID) return res.redirect("/");
  const codeData = require("./src/schemas/code");
  const code = await codeData.findOne({ rank: "normal", id: codeID });
  if (!code) return error(res, 404, codeID+" ID'li bir kod bulunmuyor!");
  res.render("code", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    data: code,
    guild,
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  });
});

app.get("/gold/:codeID", async (req, res) => {
  if (!req.user || !client.guilds.cache.get(conf.guildID).members.cache.has(req.user.id)) return error(res, 138, "Kodları görebilmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir.");
  const guild = client.guilds.cache.get(conf.guildID);
  const member = req.user ? guild.members.cache.get(req.user.id) : null;
  const codeID = req.params.codeID;
  if (!codeID) return res.redirect("/");
  if (member && !member.roles.cache.has(conf.goldRole) && !member.roles.cache.has(conf.booster) && !member.roles.cache.has(conf.ownerRole) && member.roles.cache.has(conf.adminRole)) return error(res, 501, "Bu kodu görebilmek için gerekli rolleriniz bulunmamaktadır! Lütfen bilgilendirme sayfasını okuyunuz!");
  const codeData = require("./src/schemas/code");
  const code = await codeData.findOne({ rank: "gold", id: codeID });
  if (!code) return error(res, 404, codeID+" ID'li bir kod bulunmuyor!");
  res.render("code", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    data: code,
    guild,
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  });
});

app.get("/diamond/:codeID", async (req, res) => {
  if (!req.user || !client.guilds.cache.get(conf.guildID).members.cache.has(req.user.id)) return error(res, 138, "Kodları görebilmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir.");
  const guild = client.guilds.cache.get(conf.guildID);
  const member = req.user ? guild.members.cache.get(req.user.id) : null;
  const codeID = req.params.codeID;
  if (!codeID) return res.redirect("/");
  if (member && !member.roles.cache.has(conf.diaRole) && !member.roles.cache.has(conf.booster) && !member.roles.cache.has(conf.ownerRole) && member.roles.cache.has(conf.adminRole)) return error(res, 501, "Bu kodu görebilmek için gerekli rolleriniz bulunmamaktadır! Lütfen bilgilendirme sayfasını okuyunuz!");
  const codeData = require("./src/schemas/code");
  const code = await codeData.findOne({ rank: "diamond", id: codeID });
  if (!code) return error(res, 404, codeID+" ID'li bir kod bulunmuyor!");
  res.render("code", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    data: code,
    guild,
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  });
});

app.get("/ready/:codeID", async (req, res) => {
  if (!req.user || !client.guilds.cache.get(conf.guildID).members.cache.has(req.user.id)) return error(res, 138, "Kodları görebilmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir.");
  const guild = client.guilds.cache.get(conf.guildID);
  const member = guild.members.cache.get(req.user.id);
  const codeID = req.params.codeID;
  if (!codeID) return res.redirect("/");
  if (member && !member.roles.cache.has(conf.readySystemsRole) && !member.roles.cache.has(conf.booster) && !member.roles.cache.has(conf.ownerRole) && member.roles.cache.has(conf.adminRole)) return error(res, 501, "Bu kodu görebilmek için gerekli rolleriniz bulunmamaktadır! Lütfen bilgilendirme sayfasını okuyunuz!");
  const codeData = require("./src/schemas/code");
  const code = await codeData.findOne({ rank: "ready", id: codeID });
  if (!code) return error(res, 404, codeID+" ID'li bir kod bulunmuyor!");
  res.render("code", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    data: code,
    guild,
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  });
});

app.get("/fromyou/:codeID", async (req, res) => {
  if (!req.user || !client.guilds.cache.get(conf.guildID).members.cache.has(req.user.id)) return error(res, 138, "Kodları görebilmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir.");
  const guild = client.guilds.cache.get(conf.guildID);
  const codeID = req.params.codeID;
  if (!codeID) return res.redirect("/");
  const codeData = require("./src/schemas/code");
  const code = await codeData.findOne({ rank: "fromyou", id: codeID });
  if (!code) return error(res, 404, codeID+" ID'li bir kod bulunmuyor!");
  res.render("code", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    data: code,
    guild,
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  });
});

app.get("/delete/:rank/:id", async (req, res) => {
  if (!req.user) return error(res, 138, "Bu sayfaya girmek için siteye giriş yapmalısın!");
  const guild = client.guilds.cache.get(conf.guildID);
  const member = guild.members.cache.get(req.user.id);
  if (!member) return error(res, 138, "Bu sayfaya girmek için sunuzumuza katılmalısın!");
  const codeData = require("./src/schemas/code");
  const userData = require("./src/schemas/user");
  const code = await codeData.findOne({ rank: req.params.rank, id: req.params.id });
  if (!code) return error(res, 404, req.params.id+" ID'li bir kod bulunmuyor!");
  if (!member.hasPermission(8) || !code.sharers.includes(req.user.id)) return error(res, 401, "Bu sayfaya girmek için yetkin bulunmuyor!");
  
  
  const channel = client.channels.cache.get(conf.codeLog);
  const embed = new MessageEmbed()
  .setAuthor(req.user.username, member.user.avatarURL({ dynamic: true }))
  .setThumbnail(guild.iconURL({ dynamic: true }))
  .setTitle(`${code.rank} kategorisinde bir kod silindi!`)
  .setDescription(`
• Kod adı: ${code.name}
• Kod Açıklaması: ${code.desc}
• Kodu paylaşan: ${guild.members.cache.get(code.sharers[0]) ? guild.members.cache.get(code.sharers[0]).toString() : client.users.fetch(code.sharers[0]).then(x => x.username)}
• Kodu silen: ${member.toString()}
  `)
  .setColor("RED")
  channel.send(embed);
  
  const data = await userData.findOne({ userID: req.user.id });
  if (data) {
    data.codes = data.codes.filter(x => x.id !== req.params.id);
    data.save();
  }
  
  code.deleteOne();
  res.redirect("/");
});

app.get("/edit/:rank/:id", async (req, res) => {
  if (!req.user) return error(res, 138, "Bu sayfaya girmek için siteye giriş yapmalısın!");
  const guild = client.guilds.cache.get(conf.guildID);
  const member = guild.members.cache.get(req.user.id);
  if (!member) return error(res, 138, "Bu sayfaya girmek için sunuzumuza katılmalısın!");
  const codeData = require("./src/schemas/code");
  const code = await codeData.findOne({ rank: req.params.rank, id: req.params.id });
  if (!code) return error(res, 404, req.params.id+" ID'li bir kod bulunmuyor!");
  if (!member.hasPermission(8) || !code.sharers.includes(req.user.id)) return error(res, 401, "Bu sayfaya girmek için yetkin bulunmuyor!");
  res.render("editCode", {
    user: req.user,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    isStaff: client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id).roles.cache.has("783442672496803891"),
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null,
    rank: req.params.rank,
    id: req.params.id
  });
});

app.post("/edit", async (req, res) => {
  const guild = client.guilds.cache.get(conf.guildID);
  const member = req.user ? guild.members.cache.get(req.user.id) : null;
  if (!req.user || !member) return error(res, 138, "Kod paylaşabilmek için Discord sunucumuza katılmanız ve siteye giriş yapmanız gerekmektedir.");
  const codeData = require("./src/schemas/code");
  const code = await codeData.findOne({ id: req.body.id });
  console.log(code)
  if (!code) return error(res, 404, req.body.id+" ID'li bir kod bulunmuyor!")
  
  let body = req.body;
  if (!body.name) body.name = code.name;
  if (!body.sharers) body.sharers = code.sharers;
  if (!body.desc) body.desc = code.desc;
  if (!body.modules) body.modules = code.modules;
  if (!body.mainCode) body.mainCode = code.mainCode;
  if (!body.command) body.command = code.command;
  if (!body.rank) body.rank = code.rank;
  
  code.name = body.name;
  code.sharers = body.sharers;
  code.desc = body.desc
  code.modules = body.modules
  code.mainCode = body.mainCode
  code.command = body.command
  code.rank = body.rank
  code.bug = null;
  code.save();
 
  const channel = client.channels.cache.get(conf.codeLog);
  const embed = new MessageEmbed()
  .setAuthor(req.user.username, member.user.avatarURL({ dynamic: true }))
  .setThumbnail(guild.iconURL({ dynamic: true }))
  .setTitle("Bir kod düzenlendi!")
  .setDescription(`
  • Kod adı: [${body.name}](https://${conf.domain}/${body.rank}/${body.id})
  • Kod Açıklaması: ${body.desc}
  • Kodu paylaşan: ${member.toString()}
  `)
  .setColor("YELLOW");
  channel.send(embed);
  res.redirect(`/${body.rank}/${body.id}`);
});

app.post("/like", async (req, res) => {
  if (!req.user) return;
  const codeData = require("./src/schemas/code");
  const userData = require("./src/schemas/user");
  const code = await codeData.findOne({ id: req.body.id });
  if (code.sharers.includes(req.user.id)) return;
  if (code.likedUsers && code.likedUsers.includes(req.user.id)) return;
  if (req.body.durum === "true") {
  if (!code.likedUsers) {
    code.likedUsers = [req.user.id]
    code.save();
  } else {
    code.likedUsers.push(req.user.id)
    code.save();
  }
  code.sharers.map(async x => {
    const sharerData = await userData.findOne({ userID: x });
    sharerData.getLikeCount += 1;
    sharerData.save();
  });
  } else {
    if (code.likedUsers && !code.likedUsers.includes(req.user.id)) return;
    code.likedUsers = code.likedUsers.filter(x => x !== req.user.id);
    code.save();
    code.sharers.map(async x => {
      const sharerData = await userData.findOne({ userID: x });
      sharerData.getLikeCount -= 1;
      sharerData.save();
    });
  }
});

app.get("/error", (req, res) => {
  res.render("error", {
    user: req.user,
    statuscode: req.query.statuscode,
    message: req.query.message,
    icon: client.guilds.cache.get(conf.guildID).iconURL({ dynamic: true }),
    reqMember: req.user ? client.guilds.cache.get(conf.guildID).members.cache.get(req.user.id) : null
  });
});

app.use((req, res) => error(res, 404, "Sayfa bulunamadı!"));
// </> Pages </>


// </> Functions </>
const error = (res, statuscode, message) => {
  return res.redirect(url.format({ pathname: "/error", query: { statuscode, message }}));
};

const randomStr = (length) => {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
// </> Functions </>

app.listen(process.env.PORT || 80);
client.login(settings.token).catch((err) => console.log(err));

client.on("ready", () => {
  console.log("Site Hazır!");
});

client.on("voiceStateUpdate", (oldState, newState) => {
  // todo create channel
  if (
    newState.voiceChannel != null &&
    newState.voiceChannel.name.startsWith("➕│Oda oluştur")
  ) {
    newState.guild
      .createChannel(`║👤 ${newState.displayName}`, {
        type: "voice",
        parent: newState.voiceChannel.parent
      })
      .then(cloneChannel => {
        newState.setVoiceChannel(cloneChannel);
        cloneChannel.setUserLimit(0);
      });
  }

  // ! leave
  if (oldState.voiceChannel != undefined) {
    if (oldState.voiceChannel.name.startsWith("║👤 ")) {
      if (oldState.voiceChannel.members.size == 0) {
        oldState.voiceChannel.delete();
      } else {
        // change name
        let matchMember = oldState.voiceChannel.members.find(
          x => `║👤 ${x.displayName}` == oldState.voiceChannel.name
        );
        if (matchMember == null) {
          oldState.voiceChannel.setName(
            `║👤 ${oldState.voiceChannel.members.random().displayName}`
          );
        }
      }
    }
  }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (
    newState.channel != null &&
    newState.channel.name.startsWith("➕・2 Kişilik Oda")
  ) {
    newState.guild.channels
      .create(`🎧・${newState.member.displayName} Odası`, {
        type: "voice",
        parent: newState.channel.parent
      })
      .then(cloneChannel => {
        newState.setChannel(cloneChannel);
        cloneChannel.setUserLimit(2);
      });
  }
  if (
    newState.channel != null &&
    newState.channel.name.startsWith("➕・3 Kişilik Oda")
  ) {
    newState.guild.channels
      .create(`🎧・${newState.member.displayName} Odası`, {
        type: "voice",
        parent: newState.channel.parent
      })
      .then(cloneChannel => {
        newState.setChannel(cloneChannel);
        cloneChannel.setUserLimit(3);
      });
  }
  if (
    newState.channel != null &&
    newState.channel.name.startsWith("➕・4 Kişilik Oda")
  ) {
    newState.guild.channels
      .create(`🎧・${newState.member.displayName} Odası`, {
        type: "voice",
        parent: newState.channel.parent
      })
      .then(cloneChannel => {
        newState.setChannel(cloneChannel);
        cloneChannel.setUserLimit(4);
      });
  }
  if (
    newState.channel != null &&
    newState.channel.name.startsWith("➕・5 Kişilik Oda")
  ) {
    newState.guild.channels
      .create(`🎧・${newState.member.displayName} Odası`, {
        type: "voice",
        parent: newState.channel.parent
      })
      .then(cloneChannel => {
        newState.setChannel(cloneChannel);
        cloneChannel.setUserLimit(5);
      });
  }
  if (
    newState.channel != null &&
    newState.channel.name.startsWith("➕│Oda oluştur")
  ) {
    newState.guild.channels
      .create(`🎧・${newState.member.displayName} Odası`, {
        type: "voice",
        parent: newState.channel.parent
      })
      .then(cloneChannel => {
        newState.setChannel(cloneChannel);
        cloneChannel.setUserLimit(0);
      });
  }
  if (
    newState.channel != null &&
    newState.channel.name.startsWith("➕│Ağlama odası")
  ) {
    newState.guild.channels
      .create(`🎧・Ağlama odası`, {
        type: "voice",
        parent: newState.channel.parent
      })
      .then(cloneChannel => {
        newState.setChannel(cloneChannel);
        cloneChannel.setUserLimit(1);
      });
  }
  if (
    newState.channel != null &&
    newState.channel.name.startsWith("Private Room")
  ) {
    newState.guild.channels
      .create(`🎧・${newState.member.displayName} Odası`, {
        type: "voice",
        parent: newState.channel.parent
      })
      .then(cloneChannel => {
        newState.setChannel(cloneChannel);
        cloneChannel.setUserLimit(0);
      });
  }
  // Kullanıcı ses kanalından ayrılınca ve kanalda kimse kalmazsa kanalı siler;
  if (oldState.channel != undefined) {
    if (oldState.channel.name.startsWith("🎧・")) {
      if (oldState.channel.members.size == 0) {
        oldState.channel.delete();
      } else {
        // İlk kullanıcı ses kanalından ayrılınca kanaldaki başka kullanıcı adını kanal adı yapar.
        let matchMember = oldState.channel.members.find(
          x => `🎧・${x.displayName} Odası` == oldState.channel.name
        );
        if (matchMember == null) {
          oldState.channel.setName(
            `🎧・${oldState.channel.members.random().displayName} Odası`
          );
        }
      }
    }
  }
});


client.on("guildMemberAdd", member => {
  var moment = require("moment");
  require("moment-duration-format");
  moment.locale("tr");
  var { Permissions } = require("discord.js");
  var x = moment(member.user.createdAt)
    .add(7, "days")
    .fromNow();
  var user = member.user;
  x = x.replace("birkaç saniye önce", " ");
  if (!x.includes("önce") || x.includes("sonra") || x == " ") {
    const kytsz = member.guild.roles.cache.find(
      r => r.id === "561991429132386350"
    );
    var rol = member.guild.roles.cache.get("662559486971478036"); // ŞÜPHELİ HESAP ROLÜNÜN İDSİNİ GİRİN
    var kayıtsız = member.guild.roles.cache.get("561991429132386350"); // UNREGİSTER ROLÜNÜN İDSİNİ GİRİN
    member.roles.add(rol);
    member.roles.remove(kytsz);

    member.user.send(
      "Selam Dostum Ne Yazık ki Sana Kötü Bir Haberim Var Hesabın 1 Hafta Gibi Kısa Bir Sürede Açıldığı İçin Fake Hesap Katagorisine Giriyorsun Lütfen Bir Yetkiliyle İletişime Geç Onlar Sana Yardımcı Olucaktır."
    );
    setTimeout(() => {}, 1000);
  } else {
  }
});


client.on("guildMemberAdd", member => {
  member.roles.add("561991429132386350"); // UNREGİSTER ROLÜNÜN İDSİNİ GİRİN
});
const ayarlar = require("./ayarlar.json");
client.on("message", msg => {
  if (msg.content === "<@!785803944374829066>") {
    msg.channel.send(
      `<@!${msg.author.id}> **My Prefix is**   ${ayarlar.prefix}`
    );
  }
});

const log = message => {
  console.log(`[${moment().format("YYYY-MM-DD HH:mm:ss")}] ${message}`);
};

process.on("unhandledRejection", error => {
  console.error("API Hatası:", error);
});

client.on("error", error => {
  console.error("WebSocket bir hatayla karşılaştı:", error);
});

client.on("ready", async () => {
  client.appInfo = await client.fetchApplication();
  setInterval(async () => {
    client.appInfo = await client.fetchApplication();
  }, 600);
});


const fs = require("fs");
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
fs.readdir("./komutlar/", (err, files) => {
  if (err) console.error(err);
  log(`Knavenin Komutları ${files.length} bu kdr simdi yuklenio`);
  files.forEach(f => {
    let props = require(`./komutlar/${f}`);
    log(`Hatipoğlu: ${props.help.name}`);
    client.commands.set(props.help.name, props);
    props.conf.aliases.forEach(alias => {
      client.aliases.set(alias, props.help.name);
    });
  });
});

client.reload = command => {
  return new Promise((resolve, reject) => {
    try {
      delete require.cache[require.resolve(`./komutlar/${command}`)];
      let cmd = require(`./komutlar/${command}`);
      client.commands.delete(command);
      client.aliases.forEach((cmd, alias) => {
        if (cmd === command) client.aliases.delete(alias);
      });
      client.commands.set(command, cmd);
      cmd.conf.aliases.forEach(alias => {
        client.aliases.set(alias, cmd.help.name);
      });
      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

client.load = command => {
  return new Promise((resolve, reject) => {
    try {
      let cmd = require(`./komutlar/${command}`);
      client.commands.set(command, cmd);
      cmd.conf.aliases.forEach(alias => {
        client.aliases.set(alias, cmd.help.name);
      });
      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

client.unload = command => {
  return new Promise((resolve, reject) => {
    try {
      delete require.cache[require.resolve(`./komutlar/${command}`)];
      let cmd = require(`./komutlar/${command}`);
      client.commands.delete(command);
      client.aliases.forEach((cmd, alias) => {
        if (cmd === command) client.aliases.delete(alias);
      });
      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

client.elevation = message => {
  if (!message.guild) {
    return;
  }

  let permlvl = 0;
  if (message.member.hasPermission("BAN_MEMBERS")) permlvl = 2;
  if (message.member.hasPermission("ADMINISTRATOR")) permlvl = 3;
  if (message.author.id === ayarlar.sahip) permlvl = 4;
  return permlvl;
};

var regToken = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;
// client.on('debug', e => {
//   console.log(chalk.bgBlue.green(e.replace(regToken, 'that was redacted')));
// });
client.on("warn", e => {
  console.log(chalk.bgYellow(e.replace(regToken, "that was redacted")));
});
client.on("error", e => {
  console.log(chalk.bgRed(e.replace(regToken, "that was redacted")));
});

const chalk = require("chalk");

client.yetkiler = message => {
  if (!message.guild) {
    return;
  }
  let permlvl = -ayarlar.varsayilanperm;
  if (message.member.hasPermission("MANAGE_MESSAGES")) permlvl = 1;
  if (message.member.hasPermission("KICK_MEMBERS")) permlvl = 2;
  if (message.member.hasPermission("BAN_MEMBERS")) permlvl = 3;
  if (message.member.hasPermission("MANAGE_GUILD")) permlvl = 4;
  if (message.member.hasPermission("ADMINISTRATOR")) permlvl = 5;
  if (message.author.id === message.guild.ownerID) permlvl = 6;
  if (message.author.id === ayarlar.sahip) permlvl = 7;
  return permlvl;
};
//komutlar-----------------
  client.on("message", async(msg) => {

        if (msg.content === "ping") {
            msg.channel.send(`${client.ws.ping}`)
        } else return;
    })﻿
    
    

client.on("ready", async message => {
  const channel = client.channels.cache.get("761243642958315540");
  if (!channel) return console.error("Kanal 'ID' girilmemiş.");
  channel
    .join()
    .then(connection => {
      connection.voice.setSelfDeaf(true);
      console.log("Başarıyla bağlanıldı.");
    })
    .catch(e => {
      console.error(e);
    });
});