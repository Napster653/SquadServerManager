const express = require('express');
const flash = require('connect-flash');
const passport = require('passport');
const steamcmd = require('steamcmd');
const sqlite3 = require('sqlite3');
var db = new sqlite3.Database('./db/ssm.db');
var sql_get_gameservers = 'SELECT * FROM GameServer';

const databaseSetup = require('./config/database-setup');
const passportSetup = require('./config/passport-setup');

steamcmd.download({ binDir: 'resources/steamcmd' });

var app = express();

app.set('view engine', 'ejs');
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function (req, res, next)
{
	res.locals.user = req.user;
	res.locals.message = req.flash('error');
	db.all(sql_get_gameservers, function (err, rows)
	{
		if (err) throw err;
		if (req.user) { res.locals.gameservers = rows; }
		console.log('A request was received: ' + req.method + req.url);
		next();
	});
});

app.use(require('./routes/index.js'));
app.use(require('./routes/account.js'));
app.use(require('./routes/gameservers.js'));
app.use(require('./routes/config-server.js'));
app.use(require('./routes/config-servermessages.js'));
app.use(require('./routes/config-maprotation.js'));
app.use(require('./routes/config-motd.js'));
app.use(require('./routes/config-license.js'));
app.use(require('./routes/config-rcon.js'));
app.use(require('./routes/config-admins.js'));
app.use(require('./routes/config-remoteadminlisthosts.js'));
app.use(require('./routes/config-bans.js'));
app.use(require('./routes/config-remotebanlisthosts.js'));

app.get('/favicon.ico', (req, res) =>
{
	res.sendFile(__dirname + "/favicon.ico");
});

var server = app.listen(6530, () =>
{
	var port = server.address().port;
	console.log("\n============================\n" +
		"Squad Server Manager started\n\n" +
		"Server running on port " + port +
		"\n============================\n"
	);
});
