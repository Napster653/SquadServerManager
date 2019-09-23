const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/login', (req, res) =>
{
	res.render('login');
});

router.post('/login', passport.authenticate('local', {
	successRedirect: '/',
	failureRedirect: '/login',
	failureFlash: true
}));

router.get('/logout', (req, res) =>
{
	req.logout();
	res.redirect('/');
});

module.exports = router;