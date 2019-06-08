const passport = require('passport');
const router = require('express').Router();

router.get('/login', (req, res) =>
{
	console.log('GET login');
	res.render('login', { user: req.user });
});

router.post('/login',
	passport.authenticate('local', {
		failureRedirect: '/login'
	}), (req, res) =>
	{
		console.log('POST login');
		res.redirect('/', { user: req.user });
	}
);

router.get('/logout', (req, res) =>
{
	console.log('GET logout');
	req.logout();
	res.redirect('/');
});

module.exports = router;
