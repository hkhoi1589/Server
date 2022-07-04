const router = require('express').Router(); //route
const userCtrl = require('../controllers/user.controller');

// Get random friends
router.post('/', userCtrl.getFriend);
// Search friends
router.post('/search', userCtrl.searchFriend);
// Follow a user
router.put('/follow/:friendId', userCtrl.follow);
// Unfollow a user
router.put('/unfollow/:friendId', userCtrl.unfollow);
// Get user by id
router.get('/:id', userCtrl.getUser);
// Update user
router.put('/', userCtrl.updateUser);
// Delete user
router.delete('/', userCtrl.deleteUser);

module.exports = router;
