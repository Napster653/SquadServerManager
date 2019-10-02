const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3');
const sql_select_all = 'SELECT * FROM User WHERE Username = ?';
var db = new sqlite3.Database('./db/ssm.db');

passport.use(new LocalStrategy({ passReqToCallback: true }, function (req, Username, Password, callback)
{
	db.get(sql_select_all, [Username], (err, row) =>
	{
		if (err) { return callback(err); }
		if (typeof row == 'undefined')
		{
			return callback(null, false, { 'message': 'Wrong username or password' });
		}
		bcrypt.compare(Password, row.PasswordHash, (err, res) =>
		{
			if (err) { throw err };
			if (!res) { return callback(null, false, { 'message': 'Wrong username or password' }); }
			else { return callback(null, row); }
		});
	});
}));

passport.serializeUser(function (user, callback)
{
	callback(null, user.Username);
});

passport.deserializeUser(function (Username, callback)
{
	db.get(sql_select_all, [Username], (err, row) =>
	{
		if (err) throw err;
		return callback(null, row);
	});
});