const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const express = require('express');
const router = express.Router();

const regex_remove_comments = /^\/\/.*/gm;
const regex_bans = /^(?<ID64>\d*)\:(?<Timestamp>\d*)(?:[ ]*(?:\/\/)+[ ]*(?<Comment>.*)*)*/gm;
const regex_form_bans = /\d+\-ID64/gm;
const sql_get_gameserver_by_Id = 'SELECT * FROM GameServer WHERE Id = ?';

var db = new sqlite3.Database('./db/users.db');


router.get('/gameservers/:id/config/bans', (req, res) =>
{
	if (req.user)
	{
		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, row)
		{
			if (err) { throw err; }
			if (typeof row !== 'undefined')
			{
				var gameserverconfig_bans = [];
				var fileContents = fs.readFileSync(path.join(row.InstallationRoute, '/SquadGame/ServerConfig/Bans.cfg'), "utf8");

				fileContents = fileContents.replace(regex_remove_comments, "");

				while ((CapturedGroup = regex_bans.exec(fileContents)) !== null)
				{
					gameserverconfig_bans.push({
						ID64: CapturedGroup.groups.ID64,
						Timestamp: CapturedGroup.groups.Timestamp,
						Comment: CapturedGroup.groups.Comment
					});
				}

				res.render('gameservers/config/bans', {
					gameserver: row,
					gameserverconfig_bans: gameserverconfig_bans
				});
			}
		});
	}
	else res.render('login');
});

router.post('/gameservers/:id/config/bans', (req, res) =>
{
	if (req.user)
	{
		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, row)
		{
			if (err) throw err;

			var Bans = [];

			Object.keys(req.body).forEach(function (key)
			{
				if (req.body.hasOwnProperty(key))
				{
					if (key.match(regex_form_bans) != null)
					{
						var row = "";
						row += req.body[key];
						row += ":";
						var Timestamp = new Date(req.body[key.replace(/ID64/, "Date")] + "T" + req.body[key.replace(/ID64/, "Time")] + ":00.000Z").valueOf() / 1000;
						row += isNaN(parseFloat(Timestamp)) ? "0" : Timestamp;
						row += " // ";
						row += req.body[key.replace(/ID64/, "Comment")];
						delete req.body[key];
						delete req.body[key.replace(/ID64/, "Date")];
						delete req.body[key.replace(/ID64/, "Time")];
						delete req.body[key.replace(/ID64/, "Comment")];
						Bans.push(row);
					}
				}
			});

			fs.writeFileSync(path.join(row.InstallationRoute, '/SquadGame/ServerConfig/Bans.cfg'), Bans.join("\n"), "utf8");

			res.render('gameservers/view', {
				gameserver: row,
			});
		});
	}
	else res.render('login');
});

module.exports = router;