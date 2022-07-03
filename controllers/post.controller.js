const Post = require('../models').posts;
const User = require('../models').users;
const mongoose = require('mongoose');

//get 10 posts pagination
exports.getAllPosts = async (req, res) => {
	let perPage = 10; // số lượng post xuất hiện trên 1 page
	const { page } = req.params;

	try {
		const posts = await Post.find({ timestamp: -1 })
			.skip(perPage * page - perPage)
			.limit(perPage)
			.populate([
				{ path: 'author', select: '_id username profilePicture' },
				{ path: 'comments', select: '_id username profilePicture' },
				{ path: 'likers', select: '_id username profilePicture' },
			])
			.lean();
		return res.status(200).json(posts);
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// get a post by id
exports.getPost = async (req, res) => {
	const { id } = req.params;

	try {
		const post = await Post.findById(id)
			.populate([
				{ path: 'author', select: '_id username profilePicture' },
				{ path: 'comments', select: '_id username profilePicture' },
				{ path: 'likers', select: '_id username profilePicture' },
			])
			.lean();
		if (post) {
			return res.status(200).json(post);
		} else {
			return res.status(404).json({ message: 'Post is not found', type: 'error' });
		}
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

//create a post
exports.createPost = async (req, res) => {
	const { authorId, text, file } = req.body;
	if (text.length === 0 && file.length === 0)
		return res.status(400).json({ message: 'Content is empty', type: 'error' });

	try {
		let newPost = new Post({ author: new mongoose.Types.ObjectId(authorId), text, file });
		await newPost.save();
		newPost = await newPost.populate([
			{ path: 'author', select: '_id username profilePicture' },
		]);
		return res.status(200).json({
			message: 'Create successfully',
			type: 'success',
			newPost,
		});
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// update a post
exports.updatePost = async (req, res) => {
	const { id } = req.params;

	if (req.body.action === 'like') {
		try {
			return Post.findByIdAndUpdate(
				id,
				{
					$inc: { likesCount: 1 },
					$addToSet: { likers: req.body.id },
				},
				{ new: true },
				(err, post) => {
					if (err) return res.status(400).send(err);
					return res.send(post);
				}
			).populate([{ path: 'author' }, { path: 'comments' }]);
		} catch (err) {
			return res.status(400).json({ message: error.message, type: 'error' });
		}
	}

	if (req.body.action === 'unlike') {
		try {
			return Post.findByIdAndUpdate(
				id,
				{
					$inc: { likesCount: -1 },
					$pull: { likers: req.body.id },
				},
				{ new: true },
				(err, post) => {
					if (err) return res.status(400).send(err);
					return res.send(post);
				}
			);
		} catch (err) {
			return res.status(400).json({ message: error.message, type: 'error' });
		}
	}

	if (req.body.action === 'addComment') {
		try {
			return Post.findByIdAndUpdate(
				id,
				{
					$push: {
						comments: {
							commenterId: req.body.commenterId,
							text: req.body.text,
							timestamp: new Date().getTime(),
						},
					},
				},
				{ new: true },
				(err, post) => {
					if (err) return res.status(400).send(err);
					return res.send(post);
				}
			);
		} catch (err) {
			return res.status(400).json({ message: error.message, type: 'error' });
		}
	}

	if (req.body.action === 'deleteComment') {
		try {
			return Post.findByIdAndUpdate(
				id,
				{
					$pull: {
						comments: {
							_id: req.body.commentId,
						},
					},
				},
				{ new: true },
				(err, post) => {
					if (err) return res.status(400).send(err);
					return res.send(post);
				}
			);
		} catch (err) {
			return res.status(400).json({ message: error.message, type: 'error' });
		}
	}

	if (req.body.action === 'editComment') {
		try {
			return Post.findById(id, (err, post) => {
				const { comments } = post;
				const theComment = comments.find((comment) =>
					comment._id.equals(req.body.commentId)
				);

				if (!theComment) return res.status(404).send('Comment not found');
				theComment.text = req.body.text;

				return post.save((error) => {
					if (error) return res.status(500).send(error);
					return res.status(200).send(post);
				});
			});
		} catch (err) {
			return res.status(400).json({ message: error.message, type: 'error' });
		}
	}

	try {
		return Post.findByIdAndUpdate(
			id,
			{ $set: { text: req.body.text } },
			{ new: true },
			(err, post) => {
				if (err) return res.status(400).send(err);
				return res.send(post);
			}
		);
	} catch (err) {
		return res.status(400).json({ message: error.message, type: 'error' });
	}
};

// delete post
exports.deletePost = async (req, res) => {
	const { id } = req.params;
	const { userId } = req.body;
	if (!userId) return res.status(404).json({ message: 'No user ID found', type: 'error' });

	try {
		// find and update
		let user = await User.findById(userId).populate([{ path: 'saved', select: '_id' }]);

		// loai post khoi user.saved
		if (user.saved.some((f) => f._id.toString() === id)) {
			user.saved = user.saved.filter((f) => f._id.toString() !== id);
		}

		// find and update
		await Post.findByIdAndDelete(id);
		return res.status(200).json({ message: `Deleted post`, type: 'success' });
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// save
exports.save = async (req, res) => {
	const { id } = req.params;
	const { userId } = req.body;
	if (!userId) return res.status(404).json({ message: 'No user ID found', type: 'error' });

	try {
		// tim user
		let user = await User.findById(id).populate([{ path: 'saved', select: '_id' }]);

		if (user.saved.every((f) => f._id.toString() !== id)) {
			await user.updateOne({
				$push: {
					saved: {
						_id: new mongoose.Types.ObjectId(id),
					},
				},
			});

			return res.status(200).json({ message: 'Saved this post', type: 'success' });
		} else {
			return res
				.status(403)
				.json({ message: 'You should unsave this post first', type: 'error' });
		}
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// unsave
exports.unsave = async (req, res) => {
	const { id } = req.params;
	const { userId } = req.body;
	if (!userId) return res.status(404).json({ message: 'No user ID found', type: 'error' });

	try {
		// tim user
		let user = await User.findById(id).populate([{ path: 'saved', select: '_id' }]);

		if (user.saved.some((f) => f._id.toString() === id)) {
			await user.updateOne({
				$set: {
					saved: user.saved.filter((f) => f._id.toString() !== id),
				},
			});

			return res.status(200).json({ message: 'Unsave this post', type: 'success' });
		} else {
			return res
				.status(403)
				.json({ message: 'You should save this post first', type: 'error' });
		}
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};
