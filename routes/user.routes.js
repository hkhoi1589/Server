const router = require('express').Router(); //route
const userCtrl = require('../controllers/user.controller');

// Get random friends
router.post('/', userCtrl.getFriend);
// Search friends
router.post('/search', userCtrl.searchFriend);
// Follow a user
router.put('/follow/:id', userCtrl.follow);
// Unfollow a user
router.put('/unfollow/:id', userCtrl.unfollow);
// Get user
router.get('/:id', userCtrl.getUser);
// Update user
router.put('/:id', userCtrl.updateUser);
// Delete user
router.delete('/:id', userCtrl.deleteUser);

module.exports = router;
