const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const express = require('express');
const router = express.Router();

const regexLines = /(?<key>[^\/\s].*)\s*=+\s*(?<value>.*)/gm
const regexCommentedLines = /\/{2,}\s*(?<key>[^\/\s].*)\s*\=+\s*(?<value>.*)/gm
const sql_get_gameserver_by_Id = 'SELECT * FROM GameServer WHERE Id = ?';

var db = new sqlite3.Database('./db/ssm.db');


router.get('/gameservers/:id/config/server', (req, res) =>
{
	if (req.user)
	{
		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, row)
		{
			if (err) { throw err; }
			if (typeof row !== 'undefined')
			{
				var fileContents = fs.readFileSync(path.join(row.InstallationRoute, '/SquadGame/ServerConfig/Server.cfg'), "utf8");
				var GameServerConfig_Server = {}

				while ((lines = regexLines.exec(fileContents)) !== null)
				{
					GameServerConfig_Server[lines.groups.key] = { value: lines.groups.value, ignored: false };
				}
				while ((lines = regexCommentedLines.exec(fileContents)) !== null)
				{
					GameServerConfig_Server[lines.groups.key] = { value: lines.groups.value, ignored: true };
				}
				if ('ServerName' in GameServerConfig_Server)
				{
					GameServerConfig_Server['ServerName'].value = GameServerConfig_Server['ServerName'].value.replace(/\"*/g, '');
				}
				res.render('gameservers/config/server', {
					gameserver: row,
					gameserverconfig_server: GameServerConfig_Server
				});
			}
		});
	}
	else res.render('login');
});

router.post('/gameservers/:id/config/server', (req, res) =>
{
	if (req.user)
	{
		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, row)
		{
			if (err) throw err;
			var GameServerConfig_Server = {};
			Object.keys(req.body).forEach(key =>
			{
				if (key.includes('Toggle'))
				{
					if (req.body[key] == 'on')
					{
						GameServerConfig_Server[key.replace('Toggle', '')] = {
							value: req.body[key.replace('Toggle', '')],
							ignored: false
						};
					}
					else
					{
						GameServerConfig_Server[key.replace('Toggle', '')] = {
							value: req.body[key.replace('Toggle', '')],
							ignored: true
						};
					}
				}
			});
			GameServerConfig_Server['ServerName'].value = '\"' + GameServerConfig_Server['ServerName'].value + '\"';

			fs.writeFileSync(path.join(row.InstallationRoute, '/SquadGame/ServerConfig/Server.cfg'), "", "utf8");

			var WriteStream = fs.createWriteStream(path.join(row.InstallationRoute, '/SquadGame/ServerConfig/Server.cfg'), { flags: 'a' });

			Object.keys(GameServerConfig_Server).forEach(key =>
			{
				if (GameServerConfig_Server[key].ignored) { WriteStream.write('// ' + key + "=" + GameServerConfig_Server[key].value + "\n"); }
				else { WriteStream.write(key + "=" + GameServerConfig_Server[key].value + "\n"); }
			});

			WriteStream.end();

			res.render('gameservers/view', {
				gameserver: row,
			});
		});
	}
	else res.render('login');
});

module.exports = router;