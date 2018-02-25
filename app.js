//test server https://discord.gg/qgVchxV

var fs = require('fs');
var cfg = JSON.parse(fs.readFileSync('auth.json', 'utf8'));
var r6api = require('r6api')({
  email: cfg.r6sapi_email,
  password: cfg.r6sapi_pass
});
var rank_game = [
  'Unranked',
  'Copper 4',
  'Copper 3',
  'Copper 2',
  'Copper 1',
  'Bronze 4',
  'Bronze 3',
  'Bronze 2',
  'Bronze 1',
  'Silver 4',
  'Silver 3',
  'Silver 2',
  'Silver 1',
  'Gold 4',
  'Gold 3',
  'Gold 2',
  'Gold 1',
  'Platinum 3',
  'Platinum 2',
  'Platinum 1',
  'DIAMOND'
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
  res.render('index', { title: 'R6Rutils' });
});

router.get('/admin/:pass', function(req, res, next) {
  console.log('[Web] Requesting admin panel: '+req.params.pass);
  redis.get('pass_'+req.params.pass, function(err, reply) {
    var guild_id = reply;
    if (guild_id) {
        let guild = bot.guilds.find('id', guild_id);
        var roles_list = guild.roles.array();
        //console.log('[AAAAAAAAAAAAAAAAAAAAAAAAA]'+roles_list.length);
        var select = '<option value="-1">0. Не выбрано</option>';
        //console.log(roles_list[3].name);
        for (var i=0; i < roles_list.length; i++) {
          //console.log(roles_list[i].name);
          select+='<option value="'+i+'">'+(i+1)+'. '+roles_list[i].name+'</option>';
        }
        res.render('admin', { title: 'Привязка ролей на '+guild.name, roles: select});
    } else {
      res.redirect('/');
    }
  })
})

router.get('/rank/:nick', function(req, res, next) {
  //console.log(req.body.pass);
  if (!req.params.nick=='') {
    r6api.findByName(req.params.nick)
      .then(result => {
        //console.log(result[0].id);
        r6api.getRanks(result[0].id)
          .then(result => {
            console.log(result[0].emea.rank);
            res.render('index', { title: 'Your rank is: '+rank_game[result[0].emea.rank]});
          })
      })
  } else {
    res.redirect('/');
  }
});

router.post('/admin/:pass', function(req, res) {
  console.log('[Web] Posting to admin panel: '+req.params.pass);
  redis.get('pass_'+req.params.pass, function(err, reply) {
    var guild_id = reply;
    if (guild_id) {
        let guild = bot.guilds.find('id', guild_id);
        var roles_list = guild.roles.array();
        let settings = {
          "id": {
            "diamond_role": "",
            "platinum_role": "",
            "gold_role": "",
            "silver_role": "",
            "bronze_role": "",
            "copper_role": "",
            "unranked_role": ""
          }
        };

        console.log(req.body);
        
        if (req.body.diamond>=0) {settings.id.diamond_role = roles_list[req.body.diamond].id;}
        if (req.body.platinum>=0) {settings.id.platinum_role = roles_list[req.body.platinum].id;}
        if (req.body.gold>=0) {settings.id.gold_role = roles_list[req.body.gold].id;}
        if (req.body.silver>=0) {settings.id.silver_role = roles_list[req.body.silver].id;}
        if (req.body.bronze>=0) {settings.id.bronze_role = roles_list[req.body.bronze].id;}
        if (req.body.copper>=0) {settings.id.copper_role = roles_list[req.body.copper].id;}
        if (req.body.unranked>=0) {settings.id.unranked_role = roles_list[req.body.unranked].id;}

        redis.set('guild_'+guild_id, JSON.stringify(settings));

        res.redirect('/admin/'+req.params.pass);
    } else {
      res.redirect('/');
    }
  })
})

module.exports = app;

//запуск бота

bot.on('ready', () => {
  console.log('[Bot started]');
});

bot.on('guildCreate', guild => {
  let pass = Math.random().toString(36).substring(2, 15);
  let settings = {
    "id": {
      "diamond_role": "",
      "platinum_role": "",
      "gold_role": "",
      "silver_role": "",
      "bronze_role": "",
      "copper_role": "",
      "unranked_role": ""
    }
  };
  redis.set("pass_"+pass, guild.id);
  redis.set("guild_"+guild.id, JSON.stringify(settings))
  guild.owner.send("https://r6rutils.herokuapp.com/admin/"+pass+" - это страница настроек сервера");
});

bot.on('message', message => {
  //console.log(message.content);
  if (!message.author.bot & message.guild!=undefined & message.content.startsWith('$register')) {
    console.log('[Registration] Start. Nick: '+message.content.slice(10));
    redis.get('guild_'+message.guild.id, function(err, reply) {
      redis.get('guild_'+message.guild.id, function(err, reply) {
        let settings = JSON.parse(reply);
        var ids = settings.id;
        var prefix = settings.prefix;
        var nick = message.content.slice(10);
        redis.get('user_'+message.author.id, function(err, reply) {
          try {
            var last_update = JSON.parse(reply).last_update;
            var can_update = new Date().getTime() - last_update > 3*24*3600*1000;
          } catch (err) {
            console.log('[Registration] New User');
            can_update = true;
          }
          if (nick && can_update) {
            console.log('[Registration] Searching at r6db.com');
            r6api.findByName(nick)
            .then(result => {
              let user = {
                "ubisoft_id": result[0].id,
                "last_update": new Date().getTime()
              } 
              redis.set('user_'+message.author.id,JSON.stringify(user));
              r6api.getRanks(result[0].id)
              .then(result => {
              //console.log(result[0].emea.rank)
              message.channel.send(rank_game[result[0].emea.rank]);
              let rank = result[0].emea.rank;
              let roles = message.channel.guild.roles;
              let diamond = roles.find('id', ids.diamond_role);
              let plat = roles.find('id', ids.platinum_role);
              let gold = roles.find('id', ids.gold_role);
              let silver = roles.find('id', ids.silver_role);
              let bronze = roles.find('id', ids.bronze_role);
              let copper = roles.find('id', ids.copper_role);
              let unranked = roles.find('id', ids.unranked_role);
              let user = message.member;
              if (diamond!=null & rank == 20) {
                user.addRole(diamond);
              } else if (plat!=null & rank>=17 & rank<20) {
                user.addRole(plat);
              } else if (gold!=null & rank>=13 & rank<17) {
                user.addRole(gold);
              } else if (silver!=null & rank>=9 & rank<13) {
                user.addRole(silver);
              } else if (bronze!=null & rank>=5 & rank<9) {
                user.addRole(bronze);
              } else if (copper!=null & rank>=1 & rank<5) {
                user.addRole(copper);
              } else if (unranked!=null & rank == 0) {
                user.addRole(unranked);
              } 
              });
            });
          } else if (nick && !can_update) {
            let timeDiff = Math.round(Math.abs(3*24*3600*1000 - new Date().getTime() + JSON.parse(reply).last_update)/1000);
            let diffDays = Math.ceil(timeDiff / 86400)-1;
            let diffHours = Math.ceil((timeDiff % 86400) / 3600);
            let diffMinutes = Math.ceil((timeDiff % 3600) / 60);
            message.reply('следующее обновление вашего ранга возможно через: **'+diffDays+' д. '+diffHours+' ч. '+diffMinutes+' м.**');
          }
        })
      });
    });
  }
});

bot.login(cfg.discord_token);