const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const express = require('express');
const router = express.Router();

const sql_get_gameserver_by_Id = 'SELECT * FROM GameServer WHERE Id = ?';

var db = new sqlite3.Database('./db/ssm.db');


router.get('/gameservers/:id/config/advanced/maprotation', (req, res) =>
{
	if (req.user)
	{
		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, Row)
		{
			if (err) { throw err; }
			if (typeof Row !== 'undefined')
			{
				var FileContents = fs.readFileSync(path.join(Row.InstallationRoute, '/SquadGame/ServerConfig/MapRotation.cfg'), "utf8");
				res.render('gameservers/config/advanced/maprotation', {
					GameServer: Row,
					FileContents: FileContents
				});
			}
		});
	}
	else res.render('login');
});

router.post('/gameservers/:id/config/advanced/maprotation', (req, res) =>
{
	if (req.user)
	{
		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, row)
		{
			if (err) throw err;

			fs.writeFileSync(path.join(row.InstallationRoute, '/SquadGame/ServerConfig/MapRotation.cfg'), req.body.maprotation, "utf8");

			res.render('gameservers/view', {
				gameserver: row,
			});
		});
	}
	else res.render('login');
});

module.exports = router;