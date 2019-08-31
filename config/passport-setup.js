const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

var sql_select_all = 'SELECT * FROM users WHERE username = ?';

passport.use(new LocalStrategy({ passReqToCallback: true }, function (req, username, password, callback)
{
	db.get(sql_select_all, [username], (err, row) =>
	{
		if (err) { return callback(err); }
		if (typeof row == 'undefined')
		{
			return callback(null, false, { 'message': 'Wrong username or password' });
		}
		bcrypt.compare(password, row.password, (err, res) =>
		{
			if (err) { throw err };
			if (!res) { return callback(null, false, { 'message': 'Wrong username or password' }); }
			else { return callback(null, row); }
		});
	});
}));

passport.serializeUser(function (user, callback)
{
	callback(null, user.username);
});

passport.deserializeUser(function (username, callback)
{
	db.get(sql_select_all, [username], (err, row) =>
	{
		if (err) throw err;
		return callback(null, row);
	});
});