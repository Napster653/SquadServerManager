const express = require('express');
const flash = require('connect-flash');
const fs = require('fs');
const passport = require('passport');
const steamcmd = require('steamcmd');

const databaseSetup = require('./config/database-setup');
const passportSetup = require('./config/passport-setup');
const child_process = require('child_process');

// const Nssm = require('nssm');
// var svc = Nssm('SquadServerManager_0', { nssmExe: 'resources/nssm/nssm.exe' });
// svc.restart(function (err, stdout)
// {
// 	if (err) console.log(err);
// 	else console.log(stdout);
// });

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
	res.locals.gameservers = JSON.parse(fs.readFileSync('config/gameservers.json'));
	res.locals.message = req.flash('error');

	console.log('\nA request was received: ' + req.method + req.url +
		'\n\tUser: ' + res.locals.user +
		'\n\tGameservers: ' + res.locals.gameservers +
		'\n\tres.locals.message: ' + res.locals.message);

	next();
});

app.use(require('./routes/index.js'));
app.use(require('./routes/account.js'));
app.use(require('./routes/gameservers.js'));

app.get('/favicon.ico', (req, res) =>
{
	res.sendFile(__dirname + "/favicon.ico");
});


var server = app.listen(6530, () =>
{
	var port = server.address().port;
	console.log("Server running on port " + port);
});
