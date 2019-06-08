const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy(function (username, password, cb)
{
	db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) =>
	{
		if (err || typeof row == 'undefined') { return cb(err); }
		console.log(row.username + ' ' + row.password + ' ' + row.accountType);
		if (row.password != password) { return cb(null, false); }
		return cb(null, row);
	});
}));

passport.serializeUser(function (user, cb)
{
	cb(null, user.username);
});

passport.deserializeUser(function (username, cb)
{
	db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) =>
	{
		return cb(null, row);
	});
});