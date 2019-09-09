const sqlite3 = require('sqlite3');
const fs = require('fs');
const bcrypt = require('bcrypt');
const readline = require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
});

const sql_create_users = 'CREATE TABLE IF NOT EXISTS `User` (Username TEXT NOT NULL PRIMARY KEY, PasswordHash TEXT NOT NULL)';
const sql_insert = 'INSERT OR REPLACE INTO User VALUES (?, ?)';
const sql_count = 'SELECT COUNT(*) FROM User';
const sql_create_gameservers = 'CREATE TABLE IF NOT EXISTS `GameServer` (' +
	'`Id`					INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,' +
	'`ServerName`			TEXT NOT NULL,' +
	'`InstallationRoute`	TEXT NOT NULL,' +
	'`Port`					INTEGER NOT NULL,' +
	'`QueryPort`			INTEGER NOT NULL,' +
	'`Random`				TEXT NOT NULL,' +
	'`FixedMaxPlayers`		INTEGER,' +
	'`FixedMaxTickrate`		INTEGER,' +
	'`PreferPreprocessor`	TEXT,' +
	'`Log`					INTEGER NOT NULL,' +
	'`FullCrashDump`		INTEGER NOT NULL);';


if (!fs.existsSync('./db')) { fs.mkdirSync('./db'); }

var db = new sqlite3.Database('./db/users.db');
db.exec(sql_create_users);
db.exec(sql_create_gameservers);

module.exports.insert_user = function (Username, Password)
{
	bcrypt.hash(Password, 10, (err, PasswordHash) =>
	{
		if (err) throw err;
		db.run(sql_insert, [Username, PasswordHash], (err) =>
		{
			if (err) throw err;
			console.log('Row inserted');
		});
	});
};

db.get(sql_count, (err, row) =>
{
	if (err) throw err;
	if (row['COUNT(*)'] == 0)
	{
		console.log('It looks like this is the first time you run Squad Server Manager');
		console.log('Let\'s create an Administrator account!');
		var user = [];
		readline.question('Enter a username: ', (answer) =>
		{
			user.push(answer);
			readline.question('Enter a password: ', (answer) =>
			{
				user.push(answer);
				this.insert_user(user[0], user[1]);
			});
		});
	}
});


