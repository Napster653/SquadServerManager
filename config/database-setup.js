const sqlite3 = require('sqlite3');
const fs = require('fs');
const readline = require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
});
const bcrypt = require('bcrypt');

var sql_create = 'CREATE TABLE IF NOT EXISTS users (username TEXT NOT NULL PRIMARY KEY, password TEXT NOT NULL, accountType TEXT NOT NULL)';
var sql_insert = 'INSERT OR REPLACE INTO users VALUES (?, ?, ?)';
var sql_count = 'SELECT COUNT(*) FROM users';

var user = [];

if (!fs.existsSync('./db'))
{
	fs.mkdirSync('./db');
}

db = new sqlite3.Database('./db/users.db', (err) =>
{
	if (err) throw err;
	console.log('Database accessed');
});

db.exec(sql_create, (err) =>
{
	if (err) throw err;
	console.log('Table operational');
});

module.exports.insert_user = function (username, password, accountType)
{
	bcrypt.hash(password, 10, (err, hash) =>
	{
		if (err) throw err;
		db.run(sql_insert, [username, hash, accountType], (err) =>
		{
			if (err) throw err;
			console.log('Row inserted');
		});
	});
};

db.get(sql_count, (err, row) =>
{
	if (err)  throw err;
	if (row['COUNT(*)'] == 0)
	{
		console.log('It looks like this is the first time you run Squad Server Manager');
		console.log('Let\'s create an Administrator account');
		readline.question('Enter a username: ', (answer) =>
		{
			user.push(answer);
			readline.question('Enter a password: ', (answer) =>
			{
				user.push(answer);
				user.push('Administrator');
				this.insert_user(user[0], user[1], user[2]);
			});
		});
	}
});


