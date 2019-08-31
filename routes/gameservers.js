const bodyparser = require('body-parser');
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const pty = require('node-pty');
const Nssm = require('nssm');
const execFile = require('child_process').execFile;
const router = express.Router();

var urlEncodedParser = bodyparser.urlencoded({ extended: false })

const regexProgress = /progress: ([0-9]+.[0-9]+)/
const regexFinished = /Success/

var progress_preallocating = 0;
var progress_downloading = 0;
var progress_validating = 0;
var install_status = 'none';

router.get('/gameservers/add', (req, res) =>
{
	if (req.user) res.render('gameservers/add');
	else res.render('login');
});

router.post('/gameservers/add', urlEncodedParser, (req, res) =>
{
	if (req.user)
	{
		progress = 0;
		var shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
		var ptyProcess = pty.spawn(shell, [], { handleFlowControl: true });
		install_status = 'none';
		ptyProcess.on('data', (data) =>
		{
			var matchOrNull = data.match(regexProgress);

			if (data.includes('preallocating') && matchOrNull != null) { install_status = 'Preallocating...'; progress_preallocating = parseFloat(matchOrNull[1]).toFixed(0); }
			else if (data.includes('validating') && matchOrNull != null) { install_status = 'Validating...'; progress_validating = parseFloat(matchOrNull[1]).toFixed(0); }
			else if (data.includes('downloading') && matchOrNull != null) { install_status = 'Downloading...'; progress_downloading = parseFloat(matchOrNull[1]).toFixed(0); }

			matchOrNull = data.match(regexFinished);
			if (matchOrNull != null)
			{
				install_status = 'Finished';
				var alreadyInstalled = false;

				var json = JSON.parse(fs.readFileSync('config/gameservers.json'));
				json.forEach(gameserver =>
				{
					if (gameserver.installationRoute == req.body.installationRoute)
					{
						alreadyInstalled = true;
					}
				});
				if (!alreadyInstalled)
				{
					var id = json.length;
					json.push({
						id: id,
						serverName: req.body.serverName,
						installationRoute: req.body.installationRoute,
						port: '7770',
						queryPort: '8880',
						fixedMaxPlayers: '80',
						fixedMaxTickRate: '35',
						random: '',
						preferPreprocessor: '',
						log: true,
						fullCrashDump: true
					});
					fs.writeFileSync('config/gameservers.json', JSON.stringify(json, null, '\t'));

					var svc = Nssm('SquadServerManager_' + id, { nssmExe: 'resources/nssm/nssm.exe' });
					svc.install(path.join(req.body.installationRoute, 'SquadGameServer.exe'), function (err, stdout)
					{
						if (err) console.log('Service already exists: ' + err);
						else
						{
							var appParameters = '';
							appParameters += 'Port=' + json[id].port + ' ';
							appParameters += 'QueryPort=' + json[id].queryPort + ' ';
							appParameters += 'FIXEDMAXPLAYERS=' + json[id].fixedMaxPlayers + ' ';
							if (json[id].fixedMaxTickRate != '0')
							{
								appParameters += 'FIXEDMAXTICKRATE=' + json[id].fixedMaxTickRate + ' ';
							}
							if (json[id].random != '')
							{
								appParameters += 'RANDOM=' + json[id].random + ' ';
							}
							if (json[id].preferPreprocessor != '')
							{
								appParameters += 'PREFERPREPROCESSOR=' + json[id].preferPreprocessor + ' ';
							}
							if (json[id].log)
							{
								appParameters += '-log ';
							}
							if (json[id].fullCrashDump)
							{
								appParameters += '-fullcrashdump ';
							}

							console.log('appParameters: ' + appParameters);

							svc.set('Start', 'manual')
								.then(function ()
								{
									return svc.set('Description', req.body.serverName);
								})
								.then(function ()
								{
									return svc.set('AppParameters', appParameters)
								})
								.catch(function (err)
								{
									console.log('Error: ' + err);
								});
						}
					});
				}
			}
		});
		ptyProcess.write(path.join(__dirname, '../resources/steamcmd/steamcmd.exe') + ' +login anonymous +force_install_dir \"' + req.body.installationRoute + '\" +app_update 403240 validate +quit\r');

		res.render('gameservers/progress');
	}
	else res.render('login');
});

router.get('/gameservers/progress', (req, res) =>
{
	res.send({
		install_status: install_status,
		progress_validating: progress_validating.toString(),
		progress_preallocating: progress_preallocating.toString(),
		progress_downloading: progress_downloading.toString(),
	});
});

router.get('/gameservers/:id', (req, res) =>
{
	if (req.user)
	{
		res.render('gameservers/view', {
			user: req.user,
			gameserver: JSON.parse(fs.readFileSync('config/gameservers.json'))[req.params.id],
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
		res.render('gameservers/config', {
			gameserver: JSON.parse(fs.readFileSync('config/gameservers.json'))[req.params.id],
		});
	}
	else res.render('login');
});

router.post('/gameservers/:id/config', (req, res) =>
{
	if (req.user)
	{
		console.log(req.body);

		var json = JSON.parse(fs.readFileSync('config/gameservers.json'));

		json[req.params.id].serverName = req.body.serverName;
		json[req.params.id].port = req.body.port;
		json[req.params.id].queryPort = req.body.queryPort;
		json[req.params.id].fixedMaxPlayers = req.body.fixedMaxPlayers;
		json[req.params.id].fixedMaxTickRate = req.body.fixedMaxTickRate;
		json[req.params.id].random = req.body.random;
		json[req.params.id].preferPreprocessor = req.body.preferPreprocessor;
		json[req.params.id].log = req.body.log == 'on' ? 'true' : 'false';
		json[req.params.id].fullCrashDump = req.body.fullCrashDump == 'on' ? 'true' : 'false';

		fs.writeFileSync('config/gameservers.json', JSON.stringify(json, null, '\t'));

		res.render('gameservers/view', {
			gameserver: JSON.parse(fs.readFileSync('config/gameservers.json'))[req.params.id],
		});
	}
	else res.render('login');
});

module.exports = router;