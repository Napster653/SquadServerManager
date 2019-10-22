const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const express = require('express');
const router = express.Router();

const regexLines = /(?<key>[^\/\s].*)\s*=+\s*(?<value>.*)/gm
const regexCommentedLines = /\/{2,}\s*(?<key>[^\/\s].*)\s*\=+\s*(?<value>.*)/gm
const sql_get_gameserver_by_Id = 'SELECT * FROM GameServer WHERE Id = ?';

var db = new sqlite3.Database('./db/ssm.db');


router.get('/gameservers/:id/config/advanced/motd', (req, res) =>
{
	if (req.user)
	{
		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, Row)
		{
			if (err) { throw err; }
			if (typeof Row !== 'undefined')
			{
				var FileContents = fs.readFileSync(path.join(Row.InstallationRoute, '/SquadGame/ServerConfig/MOTD.cfg'), "utf8");
				res.render('gameservers/config/advanced/motd', {
					GameServer: Row,
					FileContents: FileContents
				});
			}
		});
	}
	else res.render('login');
});

router.post('/gameservers/:id/config/advanced/motd', (req, res) =>
{
	if (req.user)
	{
		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, Row)
		{
			if (err) throw err;

			fs.writeFileSync(path.join(Row.InstallationRoute, '/SquadGame/ServerConfig/MOTD.cfg'), req.body.textarea, "utf8");

			res.render('gameservers/view', {
				gameserver: Row,
			});
		});
	}
	else res.render('login');
});

module.exports = router;