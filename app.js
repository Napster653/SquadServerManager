const express = require('express');
const passport = require('passport');
const sqlite3 = require('sqlite3');
const fs = require('fs');
const passportSetup = require('./config/passport-setup');

if (!fs.existsSync('./db')) { fs.mkdirSync('./db'); }

db = new sqlite3.Database('./db/users.db', (err) =>
{
	if (err) throw err;
	console.log('Database created');
});

db.exec('CREATE TABLE IF NOT EXISTS users (username TEXT NOT NULL PRIMARY KEY, password TEXT NOT NULL, accountType TEXT NOT NULL)', (err) =>
{
	if (err) throw err;
	console.log('Table created');
});

db.run('INSERT OR REPLACE INTO users VALUES (?, ?, ?)', ['myUser', 'myPass', 'Administrator'], (err) =>
{
	if (err) throw err;
	console.log('Row inserted');
});

// db.close();

var app = express();

app.set('view engine', 'ejs');

app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));

app.use(passport.initialize());
app.use(passport.session());

app.get('/', function (req, res)
{
	res.render('home', { user: req.user });
});

app.get('/login', function (req, res)
{
	res.render('login', { user: req.user });
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }),
	function (req, res)
	{
		res.redirect('/');
	});

app.get('/logout', function (req, res)
{
	req.logout();
	res.redirect('/');
});

app.get('/profile', require('connect-ensure-login').ensureLoggedIn(),
	function (req, res)
	{
		res.render('profile', { user: req.user });
	});

app.listen(6530);
