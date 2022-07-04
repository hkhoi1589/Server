const router = require('express').Router(); //route
const postCtrl = require('../controllers/post.controller');

// get 10 posts pagination
router.get('/page/:page', postCtrl.getAllPosts);
// Get a post
router.get('/:id', postCtrl.getPost);
// create a post
router.post('/create', postCtrl.createPost);
// Update post
router.put('/:id', postCtrl.updatePost);
// Delete post
router.delete('/:id', postCtrl.deletePost);
// Save a post
router.put('/save/:id', postCtrl.save);
// Unsave a post
router.put('/unsave/:id', postCtrl.unsave);

module.exports = router;
