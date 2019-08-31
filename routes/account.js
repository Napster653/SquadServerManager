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

router.get('/profile', require('connect-ensure-login').ensureLoggedIn(), (req, res) =>
{
	res.render('profile');
});

module.exports = router;