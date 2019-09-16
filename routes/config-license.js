const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const express = require('express');
const router = express.Router();

const sql_get_gameserver_by_Id = 'SELECT * FROM GameServer WHERE Id = ?';

var db = new sqlite3.Database('./db/users.db');


router.get('/gameservers/:id/config/license', (req, res) =>
{
	if (req.user)
	{
		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, row)
		{
			if (err) { throw err; }
			if (typeof row !== 'undefined')
			{
				var fileContents = fs.readFileSync(path.join(row.InstallationRoute, '/SquadGame/ServerConfig/License.cfg'), "utf8");
				res.render('gameservers/config/license', {
					gameserver: row,
					gameserverconfig_license: fileContents
				});
			}
		});
	}
	else res.render('login');
});

router.post('/gameservers/:id/config/license', (req, res) =>
{
	if (req.user)
	{
		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, row)
		{
			if (err) throw err;

			fs.writeFileSync(path.join(row.InstallationRoute, '/SquadGame/ServerConfig/License.cfg'), req.body.License, "utf8");

			res.render('gameservers/view', {
				gameserver: row,
			});
		});
	}
	else res.render('login');
});

module.exports = router;