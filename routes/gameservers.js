// const bodyparser = require('body-parser');
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const pty = require('node-pty');
const Nssm = require('nssm');
const router = express.Router();
const sqlite3 = require('sqlite3');
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
const regexProgress = /progress: ([0-9]+.[0-9]+)/
const regexFinished = /Success/
const sql_insert_into_gameserver = 'INSERT OR REPLACE INTO GameServer VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
const sql_get_gameserver_by_Id = 'SELECT * FROM GameServer WHERE Id = ?';
const sql_get_gameserver_by_InstallationRoute = 'SELECT * FROM GameServer WHERE InstallationRoute = ? COLLATE NOCASE';
const sql_update_gameserver_by_Id = 'UPDATE Gameserver SET ServerName = $ServerName, Port = $Port, QueryPort = $QueryPort, FixedMaxPlayers = $FixedMaxPlayers, FixedMaxTickrate = $FixedMaxTickrate, Random = $Random, PreferPreprocessor = $PreferPreprocessor, Log = $Log, FullCrashDump = $FullCrashDump WHERE Id = $Id';
const sql_delete_by_Id = 'DELETE FROM GameServer WHERE Id = ?'
const defaultAppParameters = 'Port=7770 QueryPort=8880 FIXEDMAXPLAYERS=80 RANDOM=NONE FIXEDMAXTICKRATE=35';

var db = new sqlite3.Database('./db/users.db');
// var urlEncodedParser = bodyparser.urlencoded({ extended: false })
var progress = {};

function install_service (id, route)
{
	var svc = Nssm('SquadServerManager_' + id, { nssmExe: 'resources/nssm/nssm.exe' });

	svc.status(function (err)
	{
		if (err) // Service does not exist, it will be installed
		{
			svc.install(path.join(route, 'SquadGameServer.exe'))
				.then(function () { return svc.set('AppParameters', defaultAppParameters); })
				.catch(function (err) { console.error(err); })
		}
		else // Service already exists, it will be removed and then installed again
		{
			svc.remove(path.join(route, 'SquadGameServer.exe'))
				.then(function () { return svc.install(path.join(route, 'SquadGameServer.exe')); })
				.then(function () { return svc.set('AppParameters', defaultAppParameters); })
				.catch(function (err) { console.error(err); })
		}
	});
}

router.get('/gameservers/add', (req, res) =>
{
	if (req.user) { res.render('gameservers/add'); }
	else { res.render('login'); }
});

router.post('/gameservers/add',/* urlEncodedParser,*/ (req, res) =>
{
	if (req.user)
	{
		var ptyProcess = pty.spawn(shell, [], { handleFlowControl: true });

		db.get(sql_get_gameserver_by_InstallationRoute, req.body.installationRoute, function (err, row)
		{
			if (err) throw err;

			if (typeof row !== 'undefined') // GameServer already exists
			{
				var id = row.Id;
				progress[id] = { install_status: 'none', progress_validating: 0, progress_preallocating: 0, progress_downloading: 0 };
				ptyProcess.on('data', function (data)
				{
					var matchOrNull = null;
					matchOrNull = data.match(regexProgress);
					if (data.includes('preallocating') && matchOrNull != null) { progress[id].install_status = 'Preallocating...'; progress[id].progress_preallocating = parseFloat(matchOrNull[1]).toFixed(0); }
					else if (data.includes('validating') && matchOrNull != null) { progress[id].install_status = 'Validating...'; progress[id].progress_validating = parseFloat(matchOrNull[1]).toFixed(0); }
					else if (data.includes('downloading') && matchOrNull != null) { progress[id].install_status = 'Downloading...'; progress[id].progress_downloading = parseFloat(matchOrNull[1]).toFixed(0); }
					matchOrNull = data.match(regexFinished);
					if (matchOrNull != null) { progress[id].install_status = 'Finished'; } // When finished, that's it
				});
				res.render('gameservers/progress', {
					gameserver_id: id,
				});
			}
			else // GameServer doesn't exist yet
			{
				db.run(sql_insert_into_gameserver, [null, req.body.serverName, req.body.installationRoute, 7770, 8880,'NONE', 80, 35, null, false, false], function (err)
				{
					if (err) throw err;
					var id = this.lastID;
					progress[id] = { install_status: 'none', progress_validating: 0, progress_preallocating: 0, progress_downloading: 0 };
					ptyProcess.on('data', function (data)
					{
						var matchOrNull = null;
						matchOrNull = data.match(regexProgress);
						if (data.includes('preallocating') && matchOrNull != null) { progress[id].install_status = 'Preallocating...'; progress[id].progress_preallocating = parseFloat(matchOrNull[1]).toFixed(0); }
						else if (data.includes('validating') && matchOrNull != null) { progress[id].install_status = 'Validating...'; progress[id].progress_validating = parseFloat(matchOrNull[1]).toFixed(0); }
						else if (data.includes('downloading') && matchOrNull != null) { progress[id].install_status = 'Downloading...'; progress[id].progress_downloading = parseFloat(matchOrNull[1]).toFixed(0); }
						matchOrNull = data.match(regexFinished);
						if (matchOrNull != null) { progress[id].install_status = 'Finished'; install_service(id, req.body.installationRoute) } // When finished, service is installed
					});
					res.render('gameservers/progress', {
						gameserver_id: id,
					});
				});
			}
		});

		ptyProcess.write(path.join(__dirname, '../resources/steamcmd/steamcmd.exe') + ' +login anonymous +force_install_dir \"' + req.body.installationRoute + '\" +app_update 403240 validate +quit\r');
	}
	else res.render('login');
});

router.get('/gameservers/:id/progress', (req, res) =>
{
	res.send(progress[req.params.id]);
});

router.get('/gameservers/:id', (req, res) =>
{
	if (req.user)
	{
		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, row)
		{
			if (err) throw err;
			console.log(row);
			res.render('gameservers/view', {
				gameserver: row,
			});
		});
	}
	else res.render('login');
});

router.get('/gameservers/:id/start', (req, res) =>
{
	if (req.user)
	{
		console.log('START');
		var svc = Nssm('SquadServerManager_' + req.params.id, { nssmExe: 'resources/nssm/nssm.exe' });
		svc.status()
			.then(function (stdout)
			{
				if (stdout != 'SERVICE_RUNNING' && stdout != 'SERVICE_START_PENDING')
				{
					return svc.start(function (err, stdout)
					{
						if (err)
						{
							console.log('START ERR');
							res.sendStatus(500);
						}
						else
						{
							console.log('START OK');
							res.sendStatus(200);
						}
					});
				}
				else res.sendStatus(500);
			})
			.catch(function (error)
			{
				console.log('Error: ' + error);
				res.sendStatus(500);
			});
	}
	else res.render('login');
});

router.get('/gameservers/:id/stop', (req, res) =>
{
	if (req.user)
	{
		console.log('STOP');
		var svc = Nssm('SquadServerManager_' + req.params.id, { nssmExe: 'resources/nssm/nssm.exe' });
		svc.status()
			.then(function (stdout)
			{
				if (stdout != 'SERVICE_STOPPED' && stdout != 'SERVICE_STOP_PENDING')
				{
					return svc.stop(function (err, stdout)
					{
						if (err)
						{
							console.log('STOP ERR');
							res.sendStatus(500);
						}
						else
						{
							console.log('STOP OK');
							res.sendStatus(200);
						}
					});
				}
				else res.sendStatus(500);
			})
			.catch(function (error)
			{
				console.log('Error: ' + error);
				res.sendStatus(500);
			});
	}
	else res.render('login');
});

router.get('/gameservers/:id/restart', (req, res) =>
{
	if (req.user)
	{
		console.log('RESTART');
		var svc = Nssm('SquadServerManager_' + req.params.id, { nssmExe: 'resources/nssm/nssm.exe' });
		svc.status()
			.then(function (stdout)
			{
				if (stdout == 'SERVICE_RUNNING')
				{
					return svc.restart(function (err, stdout)
					{
						if (err)
						{
							console.log('RESTART ERR');
							res.sendStatus(500);
						}
						else
						{
							console.log('RESTART OK');
							res.sendStatus(200);
						}
					});
				}
				else res.sendStatus(500);
			})
			.catch(function (error)
			{
				console.log('Error: ' + error);
				res.sendStatus(500);
			});
	}
	else res.render('login');
});

router.get('/gameservers/:id/getStatus', (req, res) =>
{
	if (req.user)
	{
		var svc = Nssm('SquadServerManager_' + req.params.id, { nssmExe: 'resources/nssm/nssm.exe' });
		svc.status()
			.then(function (stdout)
			{
				res.send({ service_status: stdout });
			})
			.catch(function (error)
			{
				res.send({ service_status: 'ERROR' });
			});
	} else res.send({ service_status: 'ERROR' });
});

router.get('/gameservers/:id/config', (req, res) =>
{
	if (req.user)
	{
		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, row)
		{
			if (err) throw err;
			console.log(row);
			res.render('gameservers/config', {
				gameserver: row,
			});
		});
	}
	else res.render('login');
});

router.post('/gameservers/:id/config', (req, res) =>
{
	if (req.user)
	{
		var params = {
			$ServerName: req.body.ServerName,
			$Port: req.body.Port,
			$QueryPort: req.body.QueryPort,
			$FixedMaxPlayers: req.body.FixedMaxPlayers,
			$FixedMaxTickrate: req.body.FixedMaxTickrate,
			$Random: req.body.Random,
			$PreferPreprocessor: req.body.PreferPreprocessor,
			$Log: req.body.Log || 0,
			$FullCrashDump: req.body.FullCrashDump || 0,
			$Id: req.params.id
		}
		db.run(sql_update_gameserver_by_Id, params, function (err)
		{
			if (err) throw err;
			db.get(sql_get_gameserver_by_Id, req.params.id, function (err, row)
			{
				if (err) throw err;
				var svc = Nssm('SquadServerManager_' + req.params.id, { nssmExe: 'resources/nssm/nssm.exe' });
				var appParameters = '';
				appParameters += 'Port=' + row.Port + ' ';
				appParameters += 'QueryPort=' + row.QueryPort + ' ';
				appParameters += 'RANDOM=' + row.Random + ' ';
				if (row.FixedMaxPlayers) { appParameters += 'FIXEDMAXPLAYERS=' + row.FixedMaxPlayers + ' '; }
				if (row.FixedMaxTickrate) { appParameters += 'FIXEDMAXTICKRATE=' + row.FixedMaxTickrate + ' '; }
				if (row.PreferPreprocessor && row.PreferPreprocessor != '') { appParameters += 'PREFERPREPROCESSOR=' + row.PreferPreprocessor + ' '; }
				if (row.Log) { appParameters += '-log ' }
				if (row.FullCrashDump) { appParameters += '-fullcrashdump' }

				console.log(appParameters)

				svc.status()
					.then(function (stdout)
					{
						if (stdout == 'SERVICE_STOPPED')
						{
							return;
						}
						else
						{
							return svc.stop();
						}
					})
					.then(function (stdout)
					{
						return svc.set('AppParameters', appParameters)
					})
					.catch(function (err)
					{
						console.log('Error: ' + err);
					});
				console.log(row);
				res.render('gameservers/view', {
					gameserver: row,
				});
			});
		});
	}
	else res.render('login');
});

router.get('/gameservers/:id/uninstall', (req, res) =>
{
	if (req.user)
	{
		var svc = Nssm('SquadServerManager_' + req.params.id, { nssmExe: 'resources/nssm/nssm.exe' });
		svc.stop(function () { svc.remove('confirm', function () { }); });

		db.get(sql_get_gameserver_by_Id, req.params.id, function (err, row)
		{
			if (err) { throw err; }
			if (typeof row !== 'undefined')
			{
				var deleteFolderRecursive = function (path)
				{
					if (fs.existsSync(path))
					{
						fs.readdirSync(path).forEach(function (file, index)
						{
							var curPath = path + "/" + file;
							if (fs.lstatSync(curPath).isDirectory()) { deleteFolderRecursive(curPath); }
							else { fs.unlinkSync(curPath); }
						});
						fs.rmdirSync(path);
					}
				};
				deleteFolderRecursive(row.InstallationRoute);
				db.run(sql_delete_by_Id, req.params.id, function (err)
				{
					if (err) { throw err; }
					res.render('home');
				});
			}
			else res.render('home');
		});
	}
	else res.render('login');
});

module.exports = router;