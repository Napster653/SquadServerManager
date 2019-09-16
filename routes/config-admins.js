const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const express = require('express');
const router = express.Router();

const regex_remove_comments = /^\/\/.*/gm;
const regex_groups = /Group=(?<GroupName>.*):(?<Permissions>.*)/gm;
const regex_admins = /Admin=(?<ID64>.*):(?<GroupName>[\S]*)[\ ]*(?:\/\/)*[\ ]*(?<Comment>.*)/gm;
const regex_form_admins = /\d+\-ID64/gm;
const regex_form_groups = /(?<GroupName>.*)-(?<Permission>.*)/gm;
const sql_get_gameserver_by_Id = 'SELECT * FROM GameServer WHERE Id = ?';

var db = new sqlite3.Database('./db/users.db');


router.get('/gameservers/:id/config/admins', (req, res) =>
{
	if (req.user)
	{
		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, row)
		{
			if (err) { throw err; }
			if (typeof row !== 'undefined')
			{
				var gameserverconfig_admins = {
					Groups: {},
					Admins: []
				};

				var fileContents = fs.readFileSync(path.join(row.InstallationRoute, '/SquadGame/ServerConfig/Admins.cfg'), "utf8");

				fileContents = fileContents.replace(regex_remove_comments, "");

				while ((CapturedGroup = regex_groups.exec(fileContents)) !== null)
				{
					gameserverconfig_admins.Groups[CapturedGroup.groups.GroupName] = CapturedGroup.groups.Permissions.split(',');
				}
				while ((CapturedGroup = regex_admins.exec(fileContents)) !== null)
				{
					gameserverconfig_admins.Admins.push({
						ID64: CapturedGroup.groups.ID64,
						GroupName: CapturedGroup.groups.GroupName,
						Comment: CapturedGroup.groups.Comment
					});
				}

				res.render('gameservers/config/admins', {
					gameserver: row,
					gameserverconfig_admins: gameserverconfig_admins
				});
			}
		});
	}
	else res.render('login');
});

router.post('/gameservers/:id/config/admins', (req, res) =>
{
	if (req.user)
	{
		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, row)
		{
			if (err) throw err;

			var Admins = [];
			var Groups = {}

			Object.keys(req.body).forEach(function (key)
			{
				if (req.body.hasOwnProperty(key))
				{
					if (key.match(regex_form_admins) != null)
					{
						var row = "Admin=";
						row += req.body[key];
						row += ":";
						row += req.body[key.replace(/ID64/, "GroupName")];
						row += " // ";
						row += req.body[key.replace(/ID64/, "Comment")];
						delete req.body[key];
						delete req.body[key.replace(/ID64/, "GroupName")];
						delete req.body[key.replace(/ID64/, "Comment")];
						Admins.push(row);
					}
				}
			});

			Object.keys(req.body).forEach(function (key)
			{
				var match = regex_form_groups.exec(key)
				if (!Groups.hasOwnProperty(match.groups.GroupName))
					Groups[match.groups.GroupName] = [];
				Groups[match.groups.GroupName].push(match.groups.Permission);
			});

			fs.writeFileSync(path.join(row.InstallationRoute, '/SquadGame/ServerConfig/Admins.cfg'), "", "utf8");

			var WriteStream = fs.createWriteStream(path.join(row.InstallationRoute, '/SquadGame/ServerConfig/Admins.cfg'), { flags: 'a' });

			Object.keys(Groups).forEach(key =>
			{
				WriteStream.write("Group=" + key + ":" + Groups[key].join(",") + "\n");
			});
			WriteStream.write(Admins.join("\n"));

			WriteStream.end();

			res.render('gameservers/view', {
				gameserver: row,
			});
		});
	}
	else res.render('login');
});

module.exports = router;