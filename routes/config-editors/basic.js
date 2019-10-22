const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const express = require('express');
const router = express.Router();

const sql_get_gameserver_by_Id = 'SELECT * FROM GameServer WHERE Id = ?';

var db = new sqlite3.Database('./db/ssm.db');


router.get('/gameservers/:id/config/basic/:filename', (req, res) =>
{
	if (req.user)
	{
		var ConfigFileName = '';
		switch (req.params.filename.toLowerCase())
		{
			case "admins": ConfigFileName = 'Admins'; break;
			case "bans": ConfigFileName = 'Bans'; break;
			case "license": ConfigFileName = 'License'; break;
			case "maprotation": ConfigFileName = 'MapRotation'; break;
			case "motd": ConfigFileName = 'MOTD'; break;
			case "rcon": ConfigFileName = 'Rcon'; break;
			case "remoteadminlisthosts": ConfigFileName = 'RemoteAdminListHosts'; break;
			case "remotebanlisthosts": ConfigFileName = 'RemoteBanListHosts'; break;
			case "server": ConfigFileName = 'Server'; break;
			case "servermessages": ConfigFileName = 'ServerMessages'; break;
			default: ConfigFileName = '';
		}
		if (ConfigFileName != '')
		{
			db.get(sql_get_gameserver_by_Id, req.params.id, function (err, Row)
			{
				if (err) { throw err; }
				if (typeof Row !== 'undefined')
				{
					var FileContents = fs.readFileSync(path.join(Row.InstallationRoute, '/SquadGame/ServerConfig/' + ConfigFileName + '.cfg'), "utf8");
					res.render('gameservers/config/basic', {
						GameServer: Row,
						ConfigFileName: ConfigFileName,
						FileContents: FileContents
					});
				}
			});
		}
	}
	else res.render('login');
});

router.post('/gameservers/:id/config/basic/:filename', (req, res) =>
{
	if (req.user)
	{
		var ConfigFileName = '';
		switch (req.params.filename.toLowerCase())
		{
			case "admins": ConfigFileName = 'Admins'; break;
			case "bans": ConfigFileName = 'Bans'; break;
			case "license": ConfigFileName = 'License'; break;
			case "maprotation": ConfigFileName = 'MapRotation'; break;
			case "motd": ConfigFileName = 'MOTD'; break;
			case "rcon": ConfigFileName = 'Rcon'; break;
			case "remoteadminlisthosts": ConfigFileName = 'RemoteAdminListHosts'; break;
			case "remotebanlisthosts": ConfigFileName = 'RemoteBanListHosts'; break;
			case "server": ConfigFileName = 'Server'; break;
			case "servermessages": ConfigFileName = 'ServerMessages'; break;
			default: ConfigFileName = '';
		}
		if (ConfigFileName != '')
		{
			db.get(sql_get_gameserver_by_Id, req.params.id, function (err, Row)
			{
				if (err) throw err;

				fs.writeFileSync(path.join(Row.InstallationRoute, '/SquadGame/ServerConfig/' + ConfigFileName + '.cfg'), req.body.textarea, "utf8");

				res.render('gameservers/view', {
					gameserver: Row,
				});
			});
		}
	}
	else res.render('login');
});

module.exports = router;