const router = require('express').Router(); //route
const userCtrl = require('../controllers/user.controller');

// register
router.post('/register', userCtrl.register);

// login
router.post('/login', userCtrl.login);

// logout
router.get('/logout', userCtrl.logout);

// refresh token
router.get('/refresh_token', userCtrl.generateAccessToken);

module.exports = router;
