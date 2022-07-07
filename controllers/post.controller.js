const Post = require('../models').posts;
const User = require('../models').users;
const mongoose = require('mongoose');
const { getUserId } = require('../helpers');

//get 10 posts pagination from following
exports.getAllPosts = async (req, res) => {
	let perPage = 10; // số lượng post xuất hiện trên 1 page
	const { page } = req.params;
	const userId = getUserId(req);

	try {
		// lay cac following + userId
		let followings = await User.findById(userId).select('following');
		followings = [...followings.following, new mongoose.Types.ObjectId(userId)];

		// cac post co author trong followings
		const posts = await Post.find({ author: { $in: followings } })
			.sort({ createdAt: 'desc' }) // sap xep desc
			.skip(perPage * page - perPage)
			.limit(perPage)
			.populate([
				{ path: 'author', select: '_id username profilePicture' },
				{
					path: 'comments',
					populate: { path: 'user', select: '_id username profilePicture' },
				},
				{ path: 'likers', select: '_id username profilePicture' },
			])
			.lean();
		return res.status(200).json(posts);
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

//get 10 posts from user
exports.getAllPostsByUser = async (req, res) => {
	let perPage = 10; // số lượng post xuất hiện trên 1 page
	const { page, authorId } = req.params;

	try {
		// cac post co author trong followings
		const posts = await Post.find({ author: new mongoose.Types.ObjectId(authorId) })
			.sort({ createdAt: 'desc' }) // sap xep desc
			.skip(perPage * page - perPage)
			.limit(perPage)
			.populate([
				{ path: 'author', select: '_id username profilePicture' },
				{
					path: 'comments',
					populate: { path: 'user', select: '_id username profilePicture' },
				},
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
				{
					path: 'comments',
					populate: { path: 'user', select: '_id username profilePicture' },
				},
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
	const { text, file } = req.body;
	const authorId = getUserId(req);

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
			const post = await Post.findByIdAndUpdate(
				id,
				{
					$push: { likers: req.body.userId },
				},
				{ new: true }
			).lean();

			if (post) {
				return res.status(200).json(post);
			} else {
				return res.status(404).json({ message: 'Post is not found', type: 'error' });
			}
		} catch (error) {
			return res.status(500).json({ message: error.message, type: 'error' });
		}
	}

	if (req.body.action === 'unlike') {
		try {
			const post = await Post.findByIdAndUpdate(
				id,
				{
					$pull: { likers: req.body.userId },
				},
				{ new: true }
			).lean();

			if (post) {
				return res.status(200).json(post);
			} else {
				return res.status(404).json({ message: 'Post is not found', type: 'error' });
			}
		} catch (error) {
			return res.status(500).json({ message: error.message, type: 'error' });
		}
	}

	if (req.body.action === 'addComment') {
		if (req.body.text.length === 0)
			return res.status(400).json({ message: 'Comment is empty', type: 'error' });
		try {
			const cmt = await Post.findByIdAndUpdate(
				id,
				{
					$push: {
						comments: {
							user: new mongoose.Types.ObjectId(req.body.user),
							text: req.body.text,
						},
					},
				},
				{ new: true }
			)
				.select('comments')
				.populate({
					path: 'comments',
					populate: { path: 'user', select: '_id username profilePicture' },
				})
				.lean();

			if (cmt) {
				return res.status(200).json(cmt);
			} else {
				return res.status(404).json({ message: 'Comment is not found', type: 'error' });
			}
		} catch (error) {
			return res.status(500).json({ message: error.message, type: 'error' });
		}
	}

	if (req.body.action === 'deleteComment') {
		try {
			const cmt = await Post.findByIdAndUpdate(
				id,
				{
					$pull: {
						comments: {
							_id: req.body.commentId,
						},
					},
				},
				{ new: true }
			).lean();

			if (cmt) {
				return res.status(200).json({
					message: `Deleted comment`,
					type: 'success',
					deletedCmt: { _id: id, commentId: req.body.commentId },
				});
			} else {
				return res.status(404).json({ message: 'Comment is not found', type: 'error' });
			}
		} catch (error) {
			return res.status(500).json({ message: error.message, type: 'error' });
		}
	}

	if (req.body.action === 'editComment') {
		try {
			const post = await Post.findById(id);

			if (post) {
				const { comments } = post;
				const theComment = comments.find((comment) => comment._id === req.body.commentId);

				if (!theComment)
					return res.status(404).json({ message: 'Comment is not found', type: 'error' });
				theComment.text = req.body.text;

				await post.save();

				return res.status(200).json(post.lean());
			} else {
				return res.status(404).json({ message: 'Post is not found', type: 'error' });
			}
		} catch (error) {
			return res.status(500).json({ message: error.message, type: 'error' });
		}
	}

	try {
		const post = await Post.findByIdAndUpdate(
			id,
			{ $set: { text: req.body.text } },
			{ new: true }
		).lean();
		if (post) {
			return res.status(200).json(post);
		} else {
			return res.status(404).json({ message: 'Post is not found', type: 'error' });
		}
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// delete post
exports.deletePost = async (req, res) => {
	const { id } = req.params;
	const userId = getUserId(req);
	try {
		// loai post khoi nhung user da luu
		const post = await Post.findById(id);
		if (!post) return res.status(404).json({ message: 'Post is not found', type: 'error' });

		if (post.userSaved.length > 0) {
			post.userSaved.map(async (saveUser) => {
				let userSaved = await User.findById(saveUser);
				if (userSaved.saved.some((f) => f._id.toString() === id)) {
					await userSaved.updateOne({
						$set: {
							saved: userSaved.saved.filter((f) => f._id.toString() !== id),
						},
					});
				}
			});
		}

		// xoa post
		await Post.findByIdAndDelete(id);

		// lay lai user hien tai
		let user = await User.findById(userId).populate([
			{
				path: 'saved',
				populate: { path: 'author', select: '_id username profilePicture' },
			},
		]);
		return res.status(200).json({ message: `Deleted post`, type: 'success', user });
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// save
exports.save = async (req, res) => {
	const { id } = req.params;
	const userId = getUserId(req);
	if (!userId) return res.status(404).json({ message: 'No user ID found', type: 'error' });

	try {
		try {
			const post = await Post.find({ _id: id, userSaved: userId });
			if (post.length > 0)
				return res
					.status(400)
					.json({ message: 'You should unsave this post first', type: 'error' });

			const user = await User.findOneAndUpdate(
				{ _id: userId },
				{
					$push: { saved: new mongoose.Types.ObjectId(id) },
				},
				{ new: true }
			)
				.populate([
					{
						path: 'saved',
						populate: { path: 'author', select: '_id username profilePicture' },
					},
				])
				.lean();

			await Post.findOneAndUpdate(
				{ _id: id },
				{
					$push: { userSaved: userId },
				},
				{ new: true }
			);

			return res.status(200).json({ message: 'Saved this post', type: 'success', user });
		} catch (error) {
			return res.status(500).json({ message: error.message, type: 'error' });
		}
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};

// unsave
exports.unsave = async (req, res) => {
	const { id } = req.params;
	const userId = getUserId(req);
	if (!userId) return res.status(404).json({ message: 'No user ID found', type: 'error' });

	try {
		const post = await Post.find({ _id: id, userSaved: userId });
		if (post.length === 0)
			return res
				.status(400)
				.json({ message: 'You should save this post first', type: 'error' });

		const user = await User.findOneAndUpdate(
			{ _id: userId },
			{
				$pull: { saved: id },
			},
			{ new: true }
		)
			.populate([
				{
					path: 'saved',
					populate: { path: 'author', select: '_id username profilePicture' },
				},
			])
			.lean();

		await Post.findOneAndUpdate(
			{ _id: id },
			{
				$pull: { userSaved: userId },
			},
			{ new: true }
		);

		return res.status(200).json({ message: 'Unsave this post', type: 'success', user });
	} catch (error) {
		return res.status(500).json({ message: error.message, type: 'error' });
	}
};
