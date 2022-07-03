const router = require('express').Router(); //route
const userCtrl = require('../controllers/user.controller');

// register
router.post('/register', userCtrl.register);

// login
router.post('/login', userCtrl.login);

module.exports = router;
