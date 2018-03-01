//test server https://discord.gg/qgVchxV

var fs = require('fs');
var cfg = JSON.parse(fs.readFileSync('auth.json', 'utf8'));
var r6api = require('r6api')({
  email: cfg.r6sapi_email,
  password: cfg.r6sapi_pass
});

var support_id = '125634283258773504';
var support_dm = '417082480365928448';
var help_message = fs.readFileSync('help.txt', 'utf8');

var cooldown = 24*3600*1000; 
var rank_game = [
  'Без ранга',
  'Медь 4',
  'Медь 3',
  'Медь 2',
  'Медь 1',
  'Бронза 4',
  'Бронза 3',
  'Бронза 2',
  'Бронза 1',
  'Серебро 4',
  'Серебро 3',
  'Серебро 2',
  'Серебро 1',
  'Золото 4',
  'Золото 3',
  'Золото 2',
  'Золото 1',
  'Платина 3',
  'Платина 2',
  'Платина 1',
  'АЛМАЗ'
];

var redis = require('redis').createClient(process.env.REDIS_URL);

//инициализация Discord.js

var Discord = require('discord.js');
var bot = new Discord.Client();

//инициализация Express

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var router = express.Router();

//var index = require('./routes/index');
//var users = require('./routes/users');

var app = express();

//запуск приложения

function ConstSett() {
  this.id = {};
  this.id.diamond_role = "";
  this.id.platinum_role = "";
  this.id.gold_role = "";             //конструктор говно
  this.id.silver_role = "";
  this.id.bronze_role = "";
  this.id.copper_role = "";
  this.id.unranked_role = "";
  this.id.logs_channel = "";
}

function dlog(id, person, title, content) {
  var msg = {embed: {
    color: 3768301,
    author: {
      name: person
    },
    title: title,
    description: content,
    timestamp: new Date(),
    footer: {
      icon_url: bot.user.avatarURL
    }
  }}
  try {
    bot.channels.find('id', id).send(msg);
  } catch (err) {
    console.log('[dlog failed]');
    console.log(msg);
  }
}

const checkRank = (msg, ubi_id, ids) => {
  return new Promise(function(resolve, reject) {
    r6api.getRanks(ubi_id)    
    .then(result => {      
      let rank = result[0].emea.rank;
      let roles = msg.channel.guild.roles;
      let diamond = roles.find('id', ids.diamond_role);
      let plat = roles.find('id', ids.platinum_role);
      let gold = roles.find('id', ids.gold_role);
      let silver = roles.find('id', ids.silver_role);
      let bronze = roles.find('id', ids.bronze_role);
      let copper = roles.find('id', ids.copper_role);
      let unranked = roles.find('id', ids.unranked_role);
      let user = msg.member;
      user.removeRoles([diamond, plat, gold, silver, bronze, copper, unranked], 'Снимаю ранг перед обновлением...').then(user => {
        if (diamond!=null & rank == 20) {
          user.addRole(diamond, '... сохранено!');
        } else if (plat!=null & rank>=17 & rank<20) {
          user.addRole(plat, '... сохранено!');
        } else if (gold!=null & rank>=13 & rank<17) {
          user.addRole(gold, '... сохранено!');
        } else if (silver!=null & rank>=9 & rank<13) {
          user.addRole(silver, '... сохранено!');
        } else if (bronze!=null & rank>=5 & rank<9) {
          user.addRole(bronze, '... сохранено!');
        } else if (copper!=null & rank>=1 & rank<5) {
          user.addRole(copper, '... сохранено!');
        } else if (unranked!=null & rank == 0) {
          user.addRole(unranked, '... сохранено!');
        }
      })
      .catch(err => {
        reject('нет прав модерации');
      });
      resolve(rank);
      })
    .catch(err => {
      reject('нет доступа к r6db');
    })
  })
}

console.log('[Start]');

//запуск веб-морды

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', router);
//app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

router.get('/', function(req, res, next) {
  res.render('index', { title: 'R6Rutils', comeback: ''});
});

router.get('/admin/:pass', function(req, res, next) {
  console.log('[Web] Requesting admin panel: '+req.params.pass);
  redis.get('pass_'+req.params.pass, function(err, reply) {
    var guild_id = reply;
    if (guild_id) {
      redis.get('guild_'+guild_id, function(err, reply) {
        var settings = JSON.parse(reply);
        dlog(settings.id.logs_channel,'IP '+req.get('X-Forwarded-For'), 'Доступ к настройкам бота через веб', 'https://r6rutils.herokuapp.com/admin/'+req.params.pass);

        let guild = bot.guilds.find('id', guild_id);
        var roles_list = guild.roles.array();
        var channels_list = guild.channels.filterArray(chl => chl.type == 'text');
        //for (var i=0; i < roles_list.length; i++) {
        //  select+='<option value="'+i+'">'+(i+1)+'. '+i].name+'</option>';
        //}
        res.render('admin', { title: 'Настройка '+guild.name, roles: roles_list, channels: channels_list, settings: settings});
    

      })
    } else {
      res.redirect('/');
    }
  })
})

router.post('/admin/:pass', function(req, res) {
  console.log('[Web] Posting to admin panel: '+req.params.pass);
  redis.get('pass_'+req.params.pass, function(err, reply) {
    var guild_id = reply;
    if (guild_id) {
        let guild = bot.guilds.find('id', guild_id);
        var roles_list = guild.roles.array();
        let settings = new ConstSett();

        //console.log(req.body);
        
        settings.id.diamond_role = req.body.diamond;
        settings.id.platinum_role = req.body.platinum;
        settings.id.gold_role = req.body.gold;
        settings.id.silver_role = req.body.silver;
        settings.id.bronze_role = req.body.bronze;
        settings.id.copper_role = req.body.copper;
        settings.id.unranked_role = req.body.unranked;
        settings.id.logs_channel = req.body.logs;

        redis.set('guild_'+guild_id, JSON.stringify(settings));

        res.render('index', { title: 'Изменения сохранены', comeback: '/admin/'+req.params.pass })
        //res.redirect('/admin/'+req.params.pass);
    } else {
      res.redirect('/');
    }
  })
})

module.exports = app;

//запуск бота

bot.on('ready', () => {
  console.log('[Bot started]');
  bot.user.setPresence({
    status: 'online',
    game: {
      name: 'ЛС для помощи по боту',
      type: 'WATCHING'
    }
  });
});

bot.on('guildCreate', guild => {
  let pass = Math.random().toString(36).substring(2, 15);
  redis.set("pass_"+pass, guild.id);
  redis.set("guild_"+guild.id, JSON.stringify(new ConstSett()))
  guild.owner.send("https://r6rutils.herokuapp.com/admin/"+pass+" - это страница настроек сервера, держите ее в секрете");
});

bot.on('message', message => {
  if (message.author.bot) {return;}
  //console.log(message.content);
  if ((message.channel.type == 'dm' || message.channel.type == 'group') && message.author.id == support_id) {
    //let msg = message.content.replace(/\s{2,}/g, ' ').split(' ');
    let dm = bot.users.find('id', message.content.slice(0, 18));
    //console.log(msg[0]);
    //console.log(dm);
    if (dm) {dm.send('Ответ от поддержки ('+message.author.username+'#'+message.author.discriminator+'):\n\n'+message.content.slice(19)).then(msg => {
      message.react('🆗');
    });}
    return;
  } else if (message.channel.type == 'dm' || message.channel.type == 'group') {
    if (message.content.startsWith('$support')) {
      let dm = bot.users.find('id', support_id);
      //console.log(dm)
      if (dm) {dm.send(message.author.id+'\n'+message.author.username+'#'+message.author.discriminator+'\n\n'+message.content.slice(9)).then(msg => {
        message.react('🆗');
      });}
    } else {message.channel.send(help_message);}
    return;
  }

  if (!message.author.bot & message.guild!=undefined & message.content.startsWith('$rank')) {
    var nick = message.content.replace(/\s{2,}/g, ' ').split(' ')[1];
    console.log('[Registration] Start.Discord: '+message.author.username+'#'+message.author.discriminator+', Ubi nick: '+nick);
    redis.get('guild_'+message.guild.id, function(err, reply) {
      redis.get('guild_'+message.guild.id, function(err, reply) {
        let settings = JSON.parse(reply);
        var ids = settings.id;
        var prefix = settings.prefix;
        redis.get('user_'+message.author.id, function(err, reply) {
          try {
            let user = JSON.parse(reply);
            var last_update = user.last_update;
            var ubisoft_id = user.ubisoft_id;
            var can_update = new Date().getTime() - last_update > cooldown;
          } catch (err) {
            console.log('[Registration] New User');
            var new_user = true;
          }
          if (!nick && new_user) {
            message.reply('при первом запросе необходимо указать ник!\n\n*Поддержка - ЛС бота*');
          } else if (new_user) {
            console.log('[Registration] Searching at r6db.com');
            r6api.findByName(nick)
            .then(result => {
              let user = {
                "ubisoft_id": result[0].id,
                "last_update": new Date().getTime()
              } 
              redis.set('user_'+message.author.id, JSON.stringify(user));

              checkRank(message, result[0].id, ids).then(result => {
                dlog(ids.logs_channel, message.author.username+'#'+message.author.discriminator, 'Пользователь зарегистрирован', 'Профиль [r6db](https://r6db.com/player/'+user.ubisoft_id+')\nUser id: '+message.author.id);
                message.reply('вы успешно зарегистрировались, ваш текущий ранг: `'+rank_game[result]+'`');
              })
              .catch(reason => {
                message.reply('произошла ошибка!\nПричина: **'+reason+'**\n\n*Поддержка - ЛС бота*');
              });

            })
            .catch(reject => {
              message.reply('пользователь с никнеймом '+nick+' не найден!\n\n*Поддержка - ЛС бота*');
              console.log(reject);
            });
          } else if (can_update) {
            console.log('[Registration] Updating '+ubisoft_id);

            let user = {
              "ubisoft_id": ubisoft_id,
              "last_update": new Date().getTime()
            }
            redis.set('user_'+message.author.id, JSON.stringify(user));

            checkRank(message, ubisoft_id, ids).then(result => {
              dlog(ids.logs_channel, message.author.username+'#'+message.author.discriminator, 'Пользователь обновлен', 'Профиль [r6db](https://r6db.com/player/'+user.ubisoft_id+')\nUser id: '+message.author.id);
              message.reply('вы успешно обновились, ваш текущий ранг: `'+rank_game[result]+'`');
            })
            .catch(reason => {
              message.reply('произошла ошибка!\nПричина: **'+reason+'**\n\n*Поддержка - ЛС бота*');
            });


          } else {
            let timeDiff = Math.round(Math.abs(cooldown - new Date().getTime() + JSON.parse(reply).last_update)/1000);
            //let diffDays = Math.ceil(timeDiff / 86400)-1;
            let diffHours = Math.ceil((timeDiff % 86400) / 3600)-1;
            let diffMinutes = Math.ceil((timeDiff % 3600) / 60)-1;
            message.reply('следующее обновление вашего ранга возможно через: **'+diffHours+' ч. '+diffMinutes+' м.**\n\n*Поддержка - ЛС бота*');
            console.log('[Registration] Cooldown dont expired!');
          }
        })
      });
    });
  }
});

bot.login(cfg.discord_token);