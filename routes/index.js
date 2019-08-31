const express = require('express');
const fs = require('fs');
const router = express.Router();

router.get('/', (req, res) =>
{
	if (req.user)
	{
		res.render('home'/*, {
			user: req.user,
			gameservers: JSON.parse(fs.readFileSync('config/gameservers.json')),
		}*/);
	}
	else res.render('login');
});



module.exports = router;